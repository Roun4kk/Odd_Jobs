require('dotenv').config();
const express = require('express');
const Redis = require('ioredis');
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const server = http.createServer(app);
const mongoose = require('mongoose');
const User = require('./models/user.js');
const Post = require('./models/post.js');
const Report = require('./models/report.js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const Message = require('./models/message.js');
const { client, serviceSid } = require('./twilioClient.js');
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const cookie = require('cookie'); // Add this at the top
const multer = require('multer');
const axios = require('axios');
const cloudinary = require("cloudinary").v2;
const { PassThrough } = require("stream");
const {isValidObjectId} = require("mongoose");
const cron = require('node-cron');
const sendEmailOtp = require('./sendEmailOtp');
const API_KEY = process.env.TWO_FACTOR_API_KEY; 
const OTP_TEMPLATE = 'OTP1';
const DeletedUser = require('./models/deletedUser.js');


const upload = require("./multer");


console.log("JWT_SECRET:", process.env.JWT_SECRET);
console.log("REFRESH_SECRET:", process.env.REFRESH_SECRET);

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  username: process.env.REDIS_USERNAME,
  password: process.env.REDIS_PASSWORD,
});

redis.on('connect', () => {
  console.log('Redis connected successfully');
});

redis.on('ready', () => {
  console.log('Redis ready to receive commands');
});
redis.on('error', (err) => {
  console.error('Redis connection error:', err);
  if (err.code === 'ERR_SSL_WRONG_VERSION_NUMBER') {
    console.error('TLS version mismatch. Using rediss:// with default TLS settings. Check Node.js OpenSSL (version:', process.versions.openssl, ') or Redis Cloud requirements.');
  } else if (err.message.includes('Command timed out')) {
    console.error('Redis command timed out. Check server availability or increase commandTimeout.');
  }
  if (redis.status !== 'connecting' && redis.status !== 'connect') {
    console.log('Attempting to reconnect to Redis...');
    redis.connect().catch((reconnectErr) => {
      console.error('Reconnection failed:', reconnectErr);
    });
  }
});

redis.on('close', () => {
  console.log('Redis connection closed');
});
const OTP_EXPIRY_SECONDS = 900;
const OTP_LIMIT = 5;
const PHONE_COOLDOWN_SECONDS = 60;
const EMAIL_OTP_EXPIRY_SECONDS = 900; // 1 hour
const EMAIL_OTP_LIMIT = 5;
const EMAIL_COOLDOWN_SECONDS = 120; // 2 minutes between requests for same email (longer than phone)
console.log("Email OTP Limit:", EMAIL_OTP_LIMIT);
const allowedOrigins = [
  "http://localhost:5173",
  "https://jobdone-ecru.vercel.app",
  "http://192.168.1.4:5173"
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  exposedHeaders: ['Set-Cookie'],
}));

// app.enable('trust proxy'); // If behind a proxy

// if (process.env.NODE_ENV === 'production') {
//   app.use((req, res, next) => {
//     if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
//       next();
//     } else {
//       return res.redirect('https://' + req.headers.host + req.url);
//     }
//   });
// }

app.options("*", cors()); // Preflight requests

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  }
});


app.use(express.json());
app.use(cookieParser());

const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    console.error('Multer error details:', err);
    return res.status(400).json({ message: `Upload error: ${err.message}` });
  }
  if (err) {
    console.error('Upload error:', err.message);
    return res.status(400).json({ message: err.message });
  }
  next();
};

const PORT = process.env.PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI;

const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email , username: user.username , postIds: user.postIds , bidIds: user.bidIds , userImage: user.userImage , userBio: user.userBio , userSkills: user.userSkills},
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email , username: user.username , postIds: user.postIds , bidIds: user.bidIds , userImage: user.userImage , userBio: user.userBio , userSkills: user.userSkills},
    process.env.REFRESH_SECRET,
    { expiresIn: '60d' }
  );
};


io.use(async (socket, next) => {
  try {
    const cookies = socket.handshake.headers.cookie
      ? cookie.parse(socket.handshake.headers.cookie)
      : {};
    console.log("Socket cookies:", cookies);
    const accessToken = cookies.accessToken;

    if (!accessToken) {
      console.warn('No access token provided in cookies');
      throw new Error('No access token provided');
    }

    const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      throw new Error('User not found');
    }

    socket.user = user;
    next();
  } catch (error) {
    console.error('Socket authentication error:', error.message);
    next(new Error('Unauthorized'));
  }
});

io.on("connection", (socket) => {
  console.log("Authenticated user connected:", socket.user.username, socket.id);

  socket.on("join", (roomId) => {
    if (roomId !== socket.user.id.toString()) {
      console.log(`Unauthorized room join attempt by ${socket.user.id}`);
      return;
    }
    socket.join(roomId);
    console.log(`User ${socket.user.username} joined room ${roomId}`);
  });

  socket.on("sendMessage", async ({ receiverId, type, text, data }) => {
    console.log("📨 Received message from:", socket.user.username);
    try {
      if (!receiverId || !type) throw new Error("Invalid message format");

      const senderId = socket.user.id;
      console.log("senderId:", senderId);
      console.log("receiverId:", receiverId);
      if (!isValidObjectId(receiverId)) throw new Error("Invalid receiver ID");
      if (!isValidObjectId(senderId)) throw new Error("Invalid sender ID");
      // === Fetch both users ===
      const [receiver, sender] = await Promise.all([
        User.findById(receiverId),
        User.findById(senderId),
      ]);

      if (!receiver || !sender) throw new Error("User(s) not found");

      // === CONNECTION LOGIC ===
      // Receiver side
      const receiverConnIndex = receiver.connections.findIndex(
        (conn) => conn.user.toString() === senderId
      );

      if (receiverConnIndex === -1)  {
        if (isValidObjectId(senderId)) {
          receiver.connections.push({ user: senderId, request: true });
        }
      }

      // Sender side
      const senderConnIndex = sender.connections.findIndex(
        (conn) => conn.user.toString() === receiverId
      );

      if (senderConnIndex === -1) {
        if (isValidObjectId(receiverId)) {
          sender.connections.push({ user: receiverId, request: false });
        }
      }
      else{
        sender.connections[senderConnIndex].request = false;
      }

      // === MESSAGE CONSTRUCTION ===
      const messagePayload = {
        sender: senderId,
        receiver: receiverId,
        type,
        text: text || undefined,
        data: {},
        deletedFor: [],
        seenBy: [senderId],
      };
      if((sender.blockedUsers.includes(receiverId)) || (receiver.blockedUsers.includes(senderId))) {
        messagePayload.deletedFor.push(receiverId);
      }
      if ((type === "image" || type === "media" || type === "link") && data?.url) {
        messagePayload.data.url = data.url;
      }

      if (type === "post" && data?.postId) {
        messagePayload.data.postId = data.postId;
      }

      const savedMessage = await Message.create(messagePayload);

      // === Update lastMessage only for connections that exist ===
      const lastMessageId = savedMessage._id;

      // Update for sender - find the connection index again after potential push
      const finalSenderConnIndex = sender.connections.findIndex(
        (conn) => conn.user.toString() === receiverId
      );
      if (finalSenderConnIndex !== -1) {
        sender.connections[finalSenderConnIndex].lastMessage = lastMessageId;
      }

      // Update for receiver - find the connection index again after potential push  
      const finalReceiverConnIndex = receiver.connections.findIndex(
        (conn) => conn.user.toString() === senderId
      );
      if (finalReceiverConnIndex !== -1) {
        receiver.connections[finalReceiverConnIndex].lastMessage = lastMessageId;
      }
      console.log("🧠 Receiver notifications before save:", receiver.notifications);

      // === Save updates only if needed ===
      await sender.save();
      await receiver.save();

      // ✅ Emit only to receiver
      const response = {
        ...savedMessage._doc,
        senderId: senderId,
        receiverId: receiverId,
      };

      io.to(receiverId).emit("receiveMessage", response);
    } catch (error) {
      console.error("Message error:", error.message);
      socket.emit("messageError", { error: error.message });
    }
  });



  ["newBid", "newComment", "newReply"].forEach((event) => {
    socket.on(event, (data) => {
      if (!data || typeof data !== "object") {
        return socket.emit("error", { event, error: "Invalid payload" });
      }
      io.emit(`receive${event.charAt(0).toUpperCase() + event.slice(1)}`, {
        ...data,
        userId: socket.user.id,
      });
    });
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.user.username, socket.id);
  });
});


passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
  },
  (accessToken, refreshToken, profile, done) => {
    console.log("🔑 Google Strategy executed - got profile");
    console.log("Google profile:", profile);
    return done(null, profile);
  }
));

// Start Google OAuth
app.get("/auth/google",
  (req, res, next) => {
    console.log("🚀 Initial Google auth route hit");
    next();
  },
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get("/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: "https://jobdone-ecru.vercel.app/login?error=oauth_failed",
    session: false,
  }),
  async (req, res) => {
    console.log("✅ Google login callback hit");
    console.log("🧠 Google user in callback:", req.user);
    
    const googleUser = req.user;
    
    // Check if googleUser exists
    if (!googleUser) {
      console.error("❌ No Google user data received");
      return res.redirect("https://jobdone-ecru.vercel.app/login?error=no_user_data");
    }

    // Check if emails exist
    if (!googleUser.emails || googleUser.emails.length === 0) {
      console.error("❌ No email in Google user data");
      return res.redirect("https://jobdone-ecru.vercel.app/login?error=no_email");
    }

    const email = googleUser.emails[0].value;
    const username = googleUser.displayName;
    const googleId = googleUser.id;

    console.log("📧 Email:", email);
    console.log("👤 Username:", username);
    console.log("🆔 Google ID:", googleId);

    try {
      console.log("🔍 Checking if user exists...");
      
      // 1. Check if user already exists in MongoDB
      let user = await User.findOne({ 
        $or: [
          { email: email },
          { googleId: googleId }
        ]
      });

      console.log("👤 Existing user found:", user ? "Yes" : "No");
      
      // Updated getWorkingPhotoUrl function with URL validation
      const getWorkingPhotoUrl = async (googleUser) => {
        const originalUrl = googleUser.photos?.[0]?.value;
        const jsonPicture = googleUser._json?.picture;
        console.log("Google photo URLs:", { originalUrl, jsonPicture });

        const photoUrl = jsonPicture || originalUrl;
        if (!photoUrl) {
          console.log("No photo URL found, using fallback");
          return null;
        }

        const cleanUrl = photoUrl.replace(/=s\d+(-c)?$/, '');
        console.log("Cleaned URL:", cleanUrl);

        try {
          const response = await axios.head(cleanUrl, {
            timeout: 5000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; JobDone/1.0)'
            }
          });
          console.log("URL accessibility check:", response.status);
          return cleanUrl;
        } catch (error) {
          console.error("Error checking URL:", error.message);
          return null;
        }
      };

      let userImage = "https://res.cloudinary.com/jobdone/image/upload/v1743801776/posts/bixptelcdl5h0m7t2c8w.jpg"; // Default image
      const googleImageUrl = await getWorkingPhotoUrl(googleUser);

      // Fixed uploadGoogleImage function - make internal server request
      const uploadGoogleImage = async (googleImageUrl) => {
        try {
          console.log("Uploading Google image:", googleImageUrl);
          const response = await axios.get(googleImageUrl, { 
            responseType: "arraybuffer",
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; JobDone/1.0)'
            }
          });
          const buffer = Buffer.from(response.data);
          const contentType = response.headers["content-type"];
          const resourceType = contentType && contentType.startsWith("video") ? "video" : "image";

          return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
              {
                resource_type: resourceType,
                folder: "google_images",
              },
              (error, result) => {
                if (error) {
                  console.error("Cloudinary upload error:", error);
                  reject(error);
                } else {
                  resolve(result.secure_url);
                }
              }
            );
            const bufferStream = new PassThrough();
            bufferStream.end(buffer);
            bufferStream.pipe(uploadStream);
          });
        } catch (error) {
          console.error("Error downloading or uploading Google image:", error);
          return null;
        }
      };
        
      // 2. If not, create a new user
      if (!user) {
        console.log("🔨 Creating new user...");

        let finalUsername = username;
        let usernameExists = await User.exists({ username: finalUsername });

        while (usernameExists) {
          const randomSuffix = Math.floor(1000 + Math.random() * 9000); // 4-digit number
          finalUsername = `${username.replace(/\s+/g, '')}${randomSuffix}`;
          usernameExists = await User.exists({ username: finalUsername });
        }

        const newUserData = {
          email,
          username: finalUsername,
          googleId,
          isOAuth: true,
          verified: { email: true, phoneNumber: false },
          userImage: googleImageUrl ? await uploadGoogleImage(googleImageUrl) || userImage : userImage,
          googlePhotoUrl: googleImageUrl || "",
          postIds: [],
          bidIds: [],
          userBio: "",
          userSkills: []
        };

        console.log("📝 New user data:", newUserData);
        
        user = await User.create(newUserData);
        console.log("✅ New Google user created:", user._id);
      } else {
        console.log("✅ Existing user found:", user._id);
        // Update googleId and photo if user exists but doesn't have them
        let userUpdated = false;
        
        if (!user.googleId) {
          console.log("🔄 Adding Google ID to existing user");
          user.googleId = googleId;
          userUpdated = true;
        }
        
        // Compare current Google photo URL with stored one
        const currentGooglePhotoUrl = googleImageUrl;

        if (currentGooglePhotoUrl && user.googlePhotoUrl !== currentGooglePhotoUrl) {
          console.log("🔄 New or updated Google image found");

          const uploadedUrl = await uploadGoogleImage(currentGooglePhotoUrl);

          if (uploadedUrl) {
            user.userImage = uploadedUrl;
            user.googlePhotoUrl = currentGooglePhotoUrl;
            userUpdated = true;
          } else {
            console.warn("⚠️ Failed to upload Google image — keeping existing one");
          }
        }
        
        if (userUpdated) {
          await user.save();
        }
      }

      console.log("🎟️ Generating tokens...");
      
      // 3. Generate JWT tokens
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      console.log("🍪 Setting cookies...");
      const isProduction = process.env.NODE_ENV === 'production';
      // 4. Set tokens in cookies
      res.cookie('refreshToken', refreshToken, {
        path: '/',
        secure: isProduction, // false for localhost HTTP, true for production HTTPS
        httpOnly: true,
        sameSite: isProduction ? 'None' : 'Lax',
        domain: undefined,
        maxAge: 60 * 24 * 60 * 60 * 1000,
      });
      
      res.cookie('accessToken', accessToken, {
        path: '/',
        secure: isProduction, // false for localhost HTTP, true for production HTTPS
        httpOnly: true,
        sameSite: isProduction ? 'None' : 'Lax',
        domain: undefined,
        maxAge: 24 * 60 * 60 * 1000,
      });

      console.log("🚀 Redirecting to Profile page");
      
      // 5. Redirect to frontend Profile page
      if (process.env.GOOGLE_CALLBACK_URL === 'http://localhost:3001/auth/google/callback') {
        res.redirect('http://localhost:5173/profile');
      } else {
        res.redirect('https://jobdone-ecru.vercel.app/profile');
      }

    } catch (error) {
      console.error("❌ Google login error details:");
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Full error:", error);
      
      // Redirect to error page instead of sending JSON
      res.redirect(`https://jobdone-ecru.vercel.app/login?error=server_error`);
    }
  }
);

const verifyToken = (req, res, next) => {
  console.log("🍪 All cookies:", req.cookies);
  console.log("🔑 Authorization header:", req.headers.authorization);
  
  const token =
    req.cookies?.accessToken ||
    req.headers.authorization?.split(" ")[1];
    
  console.log("🎫 Token received:", token ? "Token present" : "No token");
  
  if (!token) {
    console.log("❌ No token provided");
    return res.status(401).json({ message: "Unauthorized: No token" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("✅ Token verified for user:", decoded.id);
    req.user = decoded;
    next();
  } catch (error) {
    console.error("❌ Token verification error:", error.message);
    return res.status(401).json({ message: "Unauthorized: Invalid token" });
  }
};

app.post('/user/info', async (req, res) => {
  const { username, email, password ,postIds} = req.body;
  const existingUser = await User.findOne({
    $or: [{ username }, { email }]
  });
  if (existingUser) {
    return res.status(400).json({ message: existingUser.username === username ? "Username already exists" : "Email already in use" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ username, email, password: hashedPassword , postIds: postIds || [] });
    res.status(200).json({ message: "User registered successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/user/check', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email : email });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (user.isOAuth) {
      return res.status(400).json({ message: "Please use Google login for this account" });
    }
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('refreshToken', refreshToken, {
      path: '/',
      secure: isProduction, // false for localhost HTTP, true for production HTTPS
      httpOnly: true,
      sameSite: isProduction ? 'None' : 'Lax',
        domain: undefined,
      maxAge: 60 * 24 * 60 * 60 * 1000,
    });

    res.cookie('accessToken', accessToken, {
      path: '/',
      secure: isProduction, // false for localhost HTTP, true for production HTTPS
      httpOnly: true,
      sameSite: isProduction ? 'None' : 'Lax',
        domain: undefined,
      maxAge: 24 * 60 * 60 * 1000,
    });
    res.status(200).json({ message: "Login successful" });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

const escapeRegex = (str) =>
  str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); 

app.get("/users/search", verifyToken, async (req, res) => {
  const { query } = req.query;

  if (!query || query.trim().length === 0) {
    return res.status(400).json({ message: "Search query is required" });
  }

  const searchQuery = query.trim();
  const escapedQuery = escapeRegex(searchQuery);
  const regexExact = new RegExp(`^${escapedQuery}$`, "i");
  const regexStartsWith = new RegExp(`^${escapedQuery}`, "i");
  const regexAnywhere = new RegExp(escapedQuery, "i");

  
  const words = searchQuery.length > 1 ? searchQuery.split(/\s+/).filter(w => w.length > 1) : [];

  try {
    const searchConditions = [
      { username: regexExact },
      { username: regexStartsWith },
      { email: regexAnywhere },
      { userBio: regexAnywhere },
      { userSkills: { $elemMatch: { $regex: regexStartsWith } } },
      { userSkills: { $elemMatch: { $regex: regexAnywhere } } },
    ];

    for (const word of words) {
      const wordRegex = new RegExp(escapeRegex(word), "i");
      searchConditions.push({ userSkills: { $elemMatch: { $regex: wordRegex } } });
    }

    const users = await User.aggregate([
      { $match: { $or: searchConditions } },
      {
        $addFields: {
          searchScore: {
            $sum: [
              { $cond: [{ $regexMatch: { input: "$username", regex: regexExact } }, 100, 0] },
              { $cond: [{ $regexMatch: { input: "$username", regex: regexStartsWith } }, 80, 0] },
              { $cond: [{ $regexMatch: { input: "$username", regex: regexAnywhere } }, 60, 0] },
              { $cond: [{
                $gt: [
                  {
                    $size: {
                      $filter: {
                        input: { $ifNull: ["$userSkills", []] },
                        cond: { $regexMatch: { input: "$$this", regex: regexExact } }
                      }
                    }
                  },
                  0
                ]
              }, 90, 0] },
              { $cond: [{
                $gt: [
                  {
                    $size: {
                      $filter: {
                        input: { $ifNull: ["$userSkills", []] },
                        cond: { $regexMatch: { input: "$$this", regex: regexAnywhere } }
                      }
                    }
                  },
                  0
                ]
              }, 70, 0] },
              { $cond: [{ $regexMatch: { input: "$userBio", regex: regexAnywhere } }, 40, 0] },
              { $cond: [{ $regexMatch: { input: "$email", regex: regexAnywhere } }, 50, 0] },
              { $multiply: ["$averageRating", 2] }
            ]
          }
        }
      },
      { $sort: { searchScore: -1, averageRating: -1, username: 1 } },
      { $limit: 20 },
      {
        $project: {
          username: 1,
          userSkills: 1,
          ratings: 1,
          userBio: 1,
          userImage: 1,
          verified: 1,
          averageRating: 1,
          totalRating: 1,
          searchScore: 1,
          _id: 1 
        }
      }
    ]);

    res.status(200).json(users);
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.put("/users/notifications", verifyToken, async (req, res) => {
  const { type, enabled } = req.body;

  if (!["comments", "bids"].includes(type)) {
    return res.status(400).json({ message: "Invalid notification type." });
  }

  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { $set: { [`allowNotifications.${type}`]: enabled } },
      { new: true }
    );

    res.status(200).json({
      message: `${type} notifications ${enabled ? "enabled" : "muted"}.`,
      allowNotifications: updatedUser.allowNotifications
    });
  } catch (error) {
    console.error("Notification update error:", error);
    res.status(500).json({ message: "Failed to update notification settings." });
  }
});


app.post('/posts', async (req, res) => {
  const { postDescription, bids, comments, mediaUrls, postUserId } = req.body;

  try {

    const user = await User.findOne({ _id: postUserId });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const post = await Post.create({
      user: user._id,
      postDescription,
      bids: bids || [],
      comments: comments || [],
      mediaUrls: mediaUrls || [],
    });

    await User.updateOne(
      { _id: user._id },
      { $push: { postIds: post._id } }
    );

    res.status(200).json({ message: "Post registered successfully" });
  } catch (error) {
    console.error("❌ Error while creating post:", error);
    res.status(500).json({ message: error.message });
  }
});

const anonymizeBidders = (posts, currentUserId) => {
  return posts.map(post => {
    const isPostOwner = post.user._id.toString() === currentUserId;

    const updatedBids = post.bids.map(bid => {
      const isBidder = bid.user._id.toString() === currentUserId;

      if (!isPostOwner && !isBidder) {
        return {
          ...bid.toObject(),
          user: {
            ...bid.user.toObject(),
            username: "Anonymous",
            userImage: null, // or a default anonymous avatar
            _id: undefined
          }
        };
      }

      return bid;
    });

    return {
      ...post.toObject(),
      bids: updatedBids
    };
  });
};

app.get('/posts', verifyToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;


    // Get total count for debugging
    const totalPosts = await Post.countDocuments({ status: "open", isDeleted: false });

    const posts = await Post.find({ status: "open", isDeleted: false })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: 'user',
        select: 'username userImage verified blockedUsers _id ratings',
        populate: {
          path: 'ratings.from',
          select: 'username userImage verified blockedUsers _id'
        }
      })
      .populate({
        path: 'bids.user',
        select: 'username userImage verified _id ratings averageRating totalRating',
      })
      .populate({
        path: 'comments.user',
        select: 'username userImage verified _id '
      })
      .populate({
        path: 'comments.replies.user',
        select: 'username userImage verified _id '
      });

    console.log('Posts fetched:', posts.length);

    const userId = req.user.id;

    const filteredPosts = posts.map(post => {
      post.bids = (post.bids || []).filter(bid => !bid.isDeleted);
      post.comments = (post.comments || []).filter(comment => !comment.isDeleted);
      post.comments = post.comments.map(comment => {
        comment.replies = (comment.replies || []).filter(reply => !reply.isDeleted);
        return comment;
      });
      return post;
    });

    const modifiedPosts = anonymizeBidders(filteredPosts, userId);

    // DEBUG: Return additional pagination info
    res.status(200).json({
      posts: modifiedPosts,
      pagination: {
        currentPage: page,
        limit: limit,
        totalPosts: totalPosts,
        totalPages: Math.ceil(totalPosts / limit),
        hasMore: (page * limit) < totalPosts
      }
    });
  } catch (err) {
    console.error("Error fetching posts:", err);
    res.status(500).json({ message: "Something went wrong" });
  }
});

app.delete("/posts", verifyToken, async (req, res) => {
  const { postId } = req.body;
  const userId = req.user.id; // decoded from JWT

  try {
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found." });
    }

    if (post.user.toString() !== userId) {
      return res.status(403).json({ message: "Unauthorized: You can only delete your own post." });
    }

    if (post.isDeleted) {
      return res.status(400).json({ message: "Post already deleted." });
    }

    post.isDeleted = true;
    await post.save();

    return res.status(200).json({ message: "Post soft deleted successfully." });
  } catch (err) {
    console.error("Error during soft delete:", err);
    return res.status(500).json({ message: "Server error while deleting post." });
  }
});

app.put("/posts/closeBidding", verifyToken, async (req, res) => {
  const { postId } = req.body;
  const userId = req.user.id;

  if (!postId) {
    return res.status(400).json({ message: "Post ID is required." });
  }

  try {
    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ message: "Post not found." });
    }

    // Ensure only the post owner can close bidding
    if (post.user.toString() !== userId) {
      return res.status(403).json({ message: "Unauthorized to close bidding on this post." });
    }

    // You may define your own status transitions if needed
    if (post.status !== "open") {
      return res.status(400).json({ message: "Bidding can only be closed on open posts." });
    }

    post.status = "closed";
    await post.save();

    return res.status(200).json({ message: "Bidding successfully closed.", status: post.status });
  } catch (error) {
    console.error("Error closing bidding:", error);
    return res.status(500).json({ message: "Server error while closing bidding." });
  }
});

app.put("/posts/openBidding", verifyToken, async (req, res) => {
  const { postId } = req.body;
  const userId = req.user.id;

  if (!postId) {
    return res.status(400).json({ message: "Post ID is required." });
  }

  try {
    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ message: "Post not found." });
    }

    // Ensure only the post owner can close bidding
    if (post.user.toString() !== userId) {
      return res.status(403).json({ message: "Unauthorized to open bidding on this post." });
    }

    // You may define your own status transitions if needed
    if (post.status !== "closed") {
      return res.status(400).json({ message: "Bidding can only be oepened on closed posts." });
    }

    post.status = "open";
    await post.save();

    return res.status(200).json({ message: "Bidding successfully opened.", status: post.status });
  } catch (error) {
    console.error("Error closing bidding:", error);
    return res.status(500).json({ message: "Server error while opening bidding." });
  }
});

app.put('/posts/setBidRange', verifyToken, async (req, res) => {
  const { postId, minBid, maxBid } = req.body;
  const userId = req.user.id;

  if (!postId || minBid == null || maxBid == null) {
    return res.status(400).json({ message: 'postId, minBid, and maxBid are required.' });
  }

  if (minBid < 0 || maxBid < 0 || minBid > maxBid) {
    return res.status(400).json({ message: 'Invalid bid range. minBid must be ≤ maxBid and both non-negative.' });
  }

  try {
    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ message: 'Post not found.' });
    }

    if (post.user.toString() !== userId) {
      return res.status(403).json({ message: 'You are not authorized to modify this post.' });
    }

    post.minimumBid = minBid;
    post.maximumBid = maxBid;
    await post.save();

    res.status(200).json({ message: 'Bid range updated successfully!', post });
  } catch (err) {
    console.error('Error setting bid range:', err);
    res.status(500).json({ message: 'Server error.' });
  }
});

app.get("/posts/search", verifyToken, async (req, res) => {
  const { query } = req.query;

  if (!query || query.trim() === "") {
    return res.status(400).json({ message: "Search query required" });
  }

  const searchQuery = query.trim();
  
  try {
    // Create text search conditions for post description
    const descriptionConditions = [
      // Exact phrase match (highest priority)
      { postDescription: new RegExp(searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "i") },
      // All words must be present (partial word matching)
      ...searchQuery.split(/\s+/).map(word => ({
        postDescription: new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "i")
      }))
    ];

    // Search for users by username (exact and partial matches)
    const userSearchConditions = [
      // Exact username match
      { username: new RegExp(`^${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i") },
      // Username starts with query
      { username: new RegExp(`^${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, "i") },
      // Username contains query
      { username: new RegExp(searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "i") }
    ];

    const matchedUsers = await User.find({
      $or: userSearchConditions
    }).select("_id username");

    const matchedUserIds = matchedUsers.map(u => u._id);

    // Build the main search query with proper scoring
    const searchConditions = [];

    // Add description search conditions
    searchConditions.push(...descriptionConditions.map(condition => ({
      ...condition,
      status: "open"
    })));

    // Add user-based search conditions
    if (matchedUserIds.length > 0) {
      searchConditions.push({
        status: "open",
        user: { $in: matchedUserIds }
      });
    }

    if (searchConditions.length === 0) {
      return res.json([]);
    }

    // Execute search with aggregation for better scoring
    const posts = await Post.aggregate([
      {
        $match: {
          status: "open",
          isDeleted: false,
          $or: searchConditions.map(condition => {
            const { status, ...rest } = condition;
            return rest;
          })
        }
      },
      // Add scoring based on relevance
      {
        $addFields: {
          searchScore: {
            $sum: [
              // Exact phrase match in description gets highest score
              {
                $cond: [
                  { $regexMatch: { input: "$postDescription", regex: new RegExp(searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "i") } },
                  100,
                  0
                ]
              },
              // Partial word matches get lower scores
              ...searchQuery.split(/\s+/).map(word => ({
                $cond: [
                  { $regexMatch: { input: "$postDescription", regex: new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "i") } },
                  10,
                  0
                ]
              })),
              // User matches get medium score
              {
                $cond: [
                  { $in: ["$user", matchedUserIds] },
                  50,
                  0
                ]
              }
            ]
          }
        }
      },
      // Sort by relevance score first, then by creation date
      {
        $sort: { searchScore: -1, createdAt: -1 }
      },
      // Remove duplicates and limit results
      {
        $group: {
          _id: "$_id",
          doc: { $first: "$$ROOT" }
        }
      },
      {
        $replaceRoot: { newRoot: "$doc" }
      },
      {
        $limit: 50 // Limit results for performance
      }
    ]);

    // Populate the results
    const populatedPosts = await Post.populate(posts, [
      {
        path: "user",
        select: "username userImage verified blockedUsers _id ratings",
        populate: {
          path: "ratings.from",
          select: "username userImage verified blockedUsers _id"
        }
      },
      {
        path: "bids.user",
        select: "username userImage verified _id ratings"
      },
      {
        path: "comments.user",
        select: "username userImage verified _id ratings"
      },
      {
        path: "comments.replies.user",
        select: "username userImage verified _id ratings"
      }
    ]);
    const filteredPosts = populatedPosts.map(post => {
      post.bids = (post.bids || []).filter(bid => !bid.isDeleted);
      post.comments = (post.comments || []).filter(comment => !comment.isDeleted);
      post.comments = post.comments.map(comment => {
        comment.replies = (comment.replies || []).filter(reply => !reply.isDeleted);
        return comment;
      });
      return post;
    });

    res.json(filteredPosts);
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/api/me", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("-password")
      .populate({
        path: "connections.user",
        select: "_id username userImage verified",
      })
      .populate({
        path: "connections.lastMessage",
        select: "_id sender receiver type text data createdAt",
      })
      .populate({
        path: "ratings.from",
        select: "_id username userImage verified",
      })
      .populate({
        path: "connections.user",
        select: "_id username userImage verified",
      });

    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json(user);
  } catch (error) {
    console.error("❌ Error in /api/me:", error.message);
    res.status(500).json({ message: "Failed to fetch user" });
  }
});

app.post('/auth/logout', verifyToken, async (req, res) => {
  try {
    // Get the accessToken from the request (cookie or header)
    const accessToken =
      req.cookies?.accessToken ||
      req.headers.authorization?.split(" ")[1];
    const isProduction = process.env.NODE_ENV === 'production';

    // If no token is provided, clear cookies and return
    if (!accessToken) {
      res.clearCookie('accessToken', {
          path: '/',
          secure: isProduction, // false for localhost HTTP, true for production HTTPS
          httpOnly: true,
          sameSite: isProduction ? 'None' : 'Lax'
      });
      res.clearCookie('refreshToken', {
          path: '/',
          secure: isProduction, // false for localhost HTTP, true for production HTTPS
          httpOnly: true,
          sameSite: isProduction ? 'None' : 'Lax'
      });
      return res.json({
        success: true,
        message: 'Logged out successfully',
      });
    }

    // Blacklist the accessToken in Redis (optional, for added security)
    try {
      const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
      const tokenKey = `blacklist:token:${decoded.id}:${accessToken}`;
      await redis.setex(tokenKey, 24 * 60 * 60, 'blacklisted'); // Match accessToken expiry (24 hours)
    } catch (jwtError) {
      console.error('Invalid token during logout:', jwtError);
      // Continue with logout even if token is invalid
    }

    // Clear authentication cookies
    res.clearCookie('accessToken', {
        path: '/',
        secure: isProduction, // false for localhost HTTP, true for production HTTPS
        httpOnly: true,
        sameSite: isProduction ? 'None' : 'Lax'
    });
    res.clearCookie('refreshToken', {
        path: '/',
        secure: isProduction, // false for localhost HTTP, true for production HTTPS
        httpOnly: true,
        sameSite: isProduction ? 'None' : 'Lax'
    });

    // Optionally clear session if express-session is used
    if (req.session) {
      await new Promise((resolve, reject) => {
        req.session.destroy((err) => {
          if (err) {
            console.error('Session destruction error:', err);
            reject(err);
          } else {
            resolve();
          }
        });
      });
    }

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed',
    });
  }
});

app.get('/protected-route', verifyToken, (req, res) => {
  res.json({ message: "This is a protected route", user: req.user });
});


app.post(
  "/upload",
  verifyToken,
  upload.fields([{ name: "files", maxCount: 10 }, { name: "file", maxCount: 1 }]),
  handleMulterError,
  async (req, res) => {
    console.log("🔥 Files received at /upload:", req.files);
    console.log("Raw req.body payload:", req.body);

    try {
      // Case 1: Multiple file upload (JobPostInput.jsx)
      if (req.files?.files?.length > 0) {
        const urls = [];

        for (const file of req.files.files) {
          const isVideo = file.mimetype.startsWith("video/");
          const result = await cloudinary.uploader.upload(file.path, {
            resource_type: "auto",
            folder: "posts",
            format: isVideo ? "mp4" : "jpg",
            public_id: file.originalname.split(".")[0],
          });

          if (!result.secure_url) {
            throw new Error(`Upload failed for ${file.originalname}`);
          }

          urls.push(result.secure_url);
        }

        return res.status(200).json({ urls });
      }

      // Case 2: Google image URL upload (for OAuth callback)
      if (req.body.googleImageUrl) {
        const googleImageUrl = req.body.googleImageUrl;

        if (!/^https?:\/\/.*/.test(googleImageUrl)) {
          return res.status(400).json({ message: "Invalid Google image URL" });
        }

        const response = await axios.get(googleImageUrl, {
          responseType: "arraybuffer",
          timeout: 10000,
          headers: { "User-Agent": "Mozilla/5.0 (compatible; JobDone/1.0)" },
        });

        const buffer = Buffer.from(response.data);
        if (!buffer.length) {
          return res.status(400).json({ message: "Empty image buffer" });
        }

        const contentType = response.headers["content-type"];
        const resourceType = contentType?.startsWith("video") ? "video" : "image";

        const uploadStream = cloudinary.uploader.upload_stream(
          {
            resource_type: "auto",
            folder: "google_images",
            format: resourceType === "video" ? "mp4" : "jpg",
          },
          (error, result) => {
            if (error) {
              console.error("Cloudinary upload error:", error);
              return res.status(500).json({ message: "Failed to upload", error: error.message });
            }
            res.status(200).json({ url: result.secure_url });
          }
        );

        const bufferStream = new PassThrough();
        bufferStream.end(buffer);
        bufferStream.pipe(uploadStream);
        return;
      }

      return res.status(400).json({ message: "No file or Google image URL provided" });
    } catch (error) {
      console.error("Error uploading file:", error);
      return res.status(500).json({ message: error.message || "Failed to upload file" });
    }
  }
);

app.post("/posts/comments", async (req, res) => {
  const { postId, commentText, username } = req.body;

  try {
    if (!postId || !commentText || !username) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // ✨ Create comment
    const newComment = {
      commentText,
      user: user._id,
    };

    post.comments.push(newComment);
    await post.save();

    // ✨ Get the new comment's ID (last pushed one)
    const addedComment = post.comments[post.comments.length - 1];

    res.status(200).json({ 
      message: "Comment added successfully",
      commentId: addedComment._id, // ✅ Return this
    });

  } catch (error) {
    console.error("❌ Error while adding comment:", error);
    res.status(500).json({ message: error.message });
  }
});

app.get("/posts/comments", async (req, res) => {
  const { postId } = req.query;

  if (!postId) {
    return res.status(400).json({ message: "postId is missing" });
  }

  try {
    const post = await Post.findById(postId)
      .populate('comments.user', 'username userImage verified')
      .populate('comments.replies.user', 'username userImage verified');
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    post.comments = (post.comments || []).filter(comment => !comment.isDeleted);
    post.comments = post.comments.map(comment => {
      comment.replies = (comment.replies || []).filter(reply => !reply.isDeleted);
      return comment;
    });

    res.status(200).json(post.comments || []);
  } catch (error) {
    console.error("❌ Error while loading comments:", error);
    res.status(500).json({ message: error.message });
  }
});


app.post("/posts/comments/replies", async (req, res) => {
  const { postId, commentId, replyText, username } = req.body;

  if (!postId || !commentId || !replyText || !username) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const comment = post.comments.id(commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    const newReply = {
      replyText,
      user: user._id,
    };

    comment.replies.push(newReply);

    await post.save();

    const addedReply = comment.replies[comment.replies.length - 1]; // ✅ Get the last pushed reply

    res.status(200).json({
      message: "Reply added successfully",
      replyId: addedReply._id, // ✅ Send back the replyId
    });

  } catch (error) {
    console.error("❌ Error while adding reply:", error);
    res.status(500).json({ message: error.message });
  }
});

app.get("/posts/bids", verifyToken, async (req, res) => {
  const { postId, sortBy } = req.query;

  if (!postId) {
    return res.status(400).json({ message: "postId is missing" });
  }

  try {
    const post = await Post.findById(postId)
      .populate('user', '_id')
      .populate('bids.user', 'username userImage verified _id averageRating totalRating');

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const currentUserId = req.user.id;
    const isPostOwner = post.user._id.toString() === currentUserId;

    // ✅ Filter out soft-deleted bids
    let bids = (post.bids || []).filter(bid => !bid.isDeleted);

    // ✅ Sort logic
    bids.sort((a, b) => {
      if (sortBy === "rating") {
        const ratingDiff = (b.user.averageRating || 0) - (a.user.averageRating || 0);
        if (ratingDiff !== 0) return ratingDiff;
      } else {
        const amountDiff = sortBy === "1"
          ? a.BidAmount - b.BidAmount
          : b.BidAmount - a.BidAmount;
        if (amountDiff !== 0) return amountDiff;
      }

      const aVer = a.user.verified?.email && a.user.verified?.phoneNumber;
      const bVer = b.user.verified?.email && b.user.verified?.phoneNumber;
      if (aVer !== bVer) return aVer ? -1 : 1;

      const timeDiff = new Date(a.createdAt) - new Date(b.createdAt);
      if (timeDiff !== 0) return timeDiff;

      return a._id.toString().localeCompare(b._id.toString());
    });

    // ✅ Anonymize unauthorized viewers
    const anonymizedBids = bids.map(bid => {
      const isBidder = bid.user._id.toString() === currentUserId;

      if (!isPostOwner && !isBidder) {
        return {
          ...bid.toObject(),
          user: {
            ...bid.user.toObject(),
            username: "Anonymous",
            userImage: null,
            _id: undefined,
          },
        };
      }

      return bid;
    });

    res.status(200).json(anonymizedBids);
  } catch (error) {
    console.error("❌ Error while loading bids:", error);
    res.status(500).json({ message: error.message });
  }
});

app.delete("/posts/bids", async (req, res) => {
  const { postId, bidId } = req.body;

  if (!postId || !bidId) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const bidToDelete = post.bids.find(b => String(b._id) === String(bidId));
    if (!bidToDelete) return res.status(404).json({ message: "Bid not found" });

    // ✅ Soft delete the bid
    bidToDelete.isDeleted = true;
    await post.save();

    // ✅ Remove postId from bidder's bidIds array
    await User.updateOne(
      { _id: bidToDelete.user },
      { $pull: { bidIds: postId } }
    );

    // ✅ Remove associated notification from job poster (post.user)
    await User.updateOne(
      { _id: post.user },
      {
        $pull: {
          notifications: {
            type: "bid",
            postId,
            bidId,
          },
        },
      }
    );

    res.status(200).json({ message: "Bid soft-deleted successfully" });
  } catch (error) {
    console.error("❌ Error while soft-deleting bid:", error);
    res.status(500).json({ message: error.message });
  }
});

app.post("/posts/bids", async (req, res) => {
  const { postId, userId, BidAmount , BidText } = req.body;

  if (!postId || !userId || !BidAmount) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    
    const newBid = {
      user: userId,
      BidAmount,
      BidText,
    };

    post.bids.push(newBid);
    await post.save();

    const savedBid = post.bids[post.bids.length - 1];

    user.bidIds.push(postId);
    await user.save();

    res.status(201).json({ message: "Bid created successfully", bid: savedBid });
  } catch (error) {
    console.error("❌ Error while creating bid:", error);
    res.status(500).json({ message: error.message });
  }
});

app.get("/posts/topbid", verifyToken, async (req, res) => {
  const { postId, sortBy } = req.query;
  if (!postId) return res.status(400).json({ message: "postId is missing" });

  try {
    const post = await Post.findById(postId)
      .populate('user', '_id')
      .populate('bids.user', 'username userImage _id verified averageRating totalRating');

    if (!post) return res.status(404).json({ message: "Post not found" });

    let bids = (post.bids || []).filter(bid => !bid.isDeleted);

    bids.sort((a, b) => {
      if (sortBy === "rating") {
        return (b.user.averageRating || 0) - (a.user.averageRating || 0);
      } else {
        const amountDiff = sortBy === '1'
          ? a.BidAmount - b.BidAmount
          : b.BidAmount - a.BidAmount;
        if (amountDiff !== 0) return amountDiff;
      }

      const aVer = a.user.verified?.email && a.user.verified?.phoneNumber;
      const bVer = b.user.verified?.email && b.user.verified?.phoneNumber;
      if (aVer !== bVer) return aVer ? -1 : 1;

      return new Date(a.createdAt) - new Date(b.createdAt)
        || a._id.toString().localeCompare(b._id.toString());
    });

    const topBid = bids[0] || null;

    if (topBid) {
      const isBidder = topBid.user._id?.toString() === req.user.id;
      const isPoster = post.user?._id?.toString() === req.user.id;

      if (!isBidder && !isPoster) {
        topBid.user.username = "Anonymous";
        topBid.user.userImage = null;
        topBid.user._id = undefined;
      }
    }

    res.json(topBid);
  } catch (error) {
    console.error("Top bid fetch error:", error);
    res.status(500).json({ message: "Server error" });
  }
});


const filterDeletedSubdocuments = (posts) => {
  return posts.map(post => {
    // Filter bids
    post.bids = (post.bids || []).filter(bid => !bid.isDeleted);
    
    // Filter top-level comments
    let comments = (post.comments || []).filter(comment => !comment.isDeleted);
    
    // For each remaining comment, filter its replies
    comments = comments.map(comment => {
      comment.replies = (comment.replies || []).filter(reply => !reply.isDeleted);
      return comment;
    });

    post.comments = comments;
    return post;
  });
};


app.get("/user/posts", verifyToken, async (req, res) => {
  const { userId } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 5;
  const skip = (page - 1) * limit;

  if (!userId) return res.status(400).json({ message: "userId is missing" });

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const postIds = user.postIds || [];
    const query = { _id: { $in: postIds }, isDeleted: false };
    const totalPosts = await Post.countDocuments(query);

    const posts = await Post.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit)
      .populate({
        path: 'user',
        select: 'username userImage verified blockedUsers _id ratings',
        populate: { path: 'ratings.from', select: 'username userImage verified blockedUsers _id' }
      })
      .populate({ path: 'bids.user', select: 'username userImage verified _id averageRating totalRating' })
      .populate({ path: 'comments.user', select: 'username userImage verified _id' })
      .populate({ path: 'comments.replies.user', select: 'username userImage verified _id' });
    
    // **CORRECTION:** Apply filtering before anonymizing and sending
    const filteredPosts = filterDeletedSubdocuments(posts);
    const modifiedPosts = anonymizeBidders(filteredPosts, req.user.id);

    res.status(200).json({
      posts: modifiedPosts,
      pagination: { currentPage: page, limit, totalPosts, totalPages: Math.ceil(totalPosts / limit), hasMore: (page * limit) < totalPosts }
    });
  } catch (error) {
    console.error("❌ Error while loading user posts:", error);
    res.status(500).json({ message: error.message });
  }
});

app.get("/user/bids", verifyToken, async (req, res) => {
  const { userId } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 5;
  const skip = (page - 1) * limit;

  if (!userId) return res.status(400).json({ message: "userId is missing" });

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const bidIds = user.bidIds || [];
    const query = { _id: { $in: bidIds }, isDeleted: false };
    const totalPosts = await Post.countDocuments(query);

    const posts = await Post.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit)
      .populate({
        path: 'user',
        select: 'username userImage verified blockedUsers _id ratings',
        populate: { path: 'ratings.from', select: 'username userImage verified blockedUsers _id' }
      })
      .populate({ path: 'bids.user', select: 'username userImage verified _id averageRating totalRating' })
      .populate({ path: 'comments.user', select: 'username userImage verified _id' })
      .populate({ path: 'comments.replies.user', select: 'username userImage verified _id' });

    // **CORRECTION:** Apply filtering before anonymizing and sending
    const filteredPosts = filterDeletedSubdocuments(posts);
    const modifiedPosts = anonymizeBidders(filteredPosts, req.user.id);

    res.status(200).json({
      posts: modifiedPosts,
      pagination: { currentPage: page, limit, totalPosts, totalPages: Math.ceil(totalPosts / limit), hasMore: (page * limit) < totalPosts }
    });
  } catch (error) {
    console.error("❌ Error while loading posts user has bid on:", error);
    res.status(500).json({ message: error.message });
  }
});
app.get("/user/reviews", verifyToken, async (req, res) => {
  const { userId } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 5;
  const skip = (page - 1) * limit;

  if (!userId) return res.status(400).json({ message: "userId is missing" });

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const reviewIds = user.ratings.map(r => r.post);
    const query = { _id: { $in: reviewIds }, isDeleted: false };
    const totalPosts = await Post.countDocuments(query);

    const posts = await Post.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit)
      .populate({
        path: 'user',
        select: 'username userImage verified blockedUsers _id ratings',
        populate: { path: 'ratings.from', select: 'username userImage verified blockedUsers _id' }
      })
      .populate({ path: 'bids.user', select: 'username userImage verified _id averageRating totalRating' })
      .populate({ path: 'comments.user', select: 'username userImage verified _id' })
      .populate({ path: 'comments.replies.user', select: 'username userImage verified _id' });

    // **CORRECTION:** Apply filtering before anonymizing and sending
    const filteredPosts = filterDeletedSubdocuments(posts);
    const modifiedPosts = anonymizeBidders(filteredPosts, req.user.id);

    res.status(200).json({
      posts: modifiedPosts,
      pagination: { currentPage: page, limit, totalPosts, totalPages: Math.ceil(totalPosts / limit), hasMore: (page * limit) < totalPosts }
    });
  } catch (error) {
    console.error("❌ Error while loading reviewed posts:", error);
    res.status(500).json({ message: error.message });
  }
});


app.put("/users/editprofile/:id", async (req, res) => {
  try {
    const { userBio, userSkills, userImage } = req.body;
    const userId = req.params.id;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { userBio, userSkills, userImage },
      { new: true } 
    );

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json(updatedUser);
  } catch (err) {
    console.error("❌ Error updating user:", err);
    res.status(500).json({ error: "Server error" });
  }
});


app.put("/users/changeUsername/:id" , async(req,res) =>{
  const{newUsername} = req.body;
  const userId = req.params.id;

  try {
    if (!newUsername || newUsername.trim() === "") {
      return res.status(400).json({ error: "New username is required" });
    }
    // Check if the new username already exists
    const existingUser = await User.findOne({ username: newUsername });
    if (existingUser) {
      return res.status(500).json({ message: "Username already exists" });
    }
    const updatedUser  = await User.findByIdAndUpdate(
      userId,
      { username:newUsername },
      { new: true } 
    );

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json(updatedUser);
  } catch (error) {
    console.error("❌ Error while changing username :", error);
    res.status(500).json({ message: error.message });
  }
} );

// PUT /posts/select-winner
app.put("/posts/select-winner", async (req, res) => {
  const { postId, userId , bidId} = req.body;

  if (!postId || !userId) {
    return res.status(400).json({ message: "postId and userId are required" });
  }

  try {
    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Check if this user has actually placed a bid
    const isValidBidder = post.bids.some(bid => bid.user.toString() === userId && bid._id.toString() === bidId);

    if (!isValidBidder) {
      return res.status(400).json({ message: "User did not bid on this post" });
    }

    // Set the winner
    post.selectedWinner = userId;
    post.status = "winnerSelected";
    post.winningBidId = bidId;

    await post.save();

    return res.status(200).json({ message: "Winner selected successfully" });
  } catch (error) {
    console.error("❌ Error selecting winner:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

app.put("/posts/mark-completed", verifyToken, async (req, res) => {
  const userId = req.user.id;
  const { postId } = req.body;

  if (!postId || !userId) {
    return res.status(400).json({ message: "postId and userId are required" });
  }

  try {
    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Correct object ID checks
    const isValidWorker = post.selectedWinner?.toString() === userId;
    const isValidProvider = post.user?.toString() === userId;

    if (!isValidWorker && !isValidProvider) {
      return res.status(403).json({ message: "User has no permission to mark this job" });
    }

    // Mark completion
    if (isValidProvider) {
      post.providerConfirmed = true;
    } else if (isValidWorker) {
      post.workerConfirmed = true;
    }

    await post.save();

    return res.status(200).json({ message: "Marked as completed successfully" });
  } catch (error) {
    console.error("❌ Error marking completed:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

app.post("/posts/review", verifyToken, async (req, res) => {
  const userId = req.user.id;
  const { postId, review, rating } = req.body;

  if (!postId || !userId || !rating) {
    return res.status(400).json({ message: "postId and rating are required" });
  }

  try {
    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    if(post.selectedWinner?.toString()===post.user?.toString()){
      return res.status(404).json({ message: "you can not rate yourself" });
    }
    const isValidWorker = post.selectedWinner?.toString() === userId.toString();
    const isValidProvider = post.user?.toString() === userId.toString();

    if (!isValidWorker && !isValidProvider) {
      return res.status(403).json({ message: "You don't have permission to review this post" });
    }

    let targetUserId;
    let reviewFieldToUpdate;

    if (isValidProvider) {
      targetUserId = post.selectedWinner;
      reviewFieldToUpdate = "reviewedByProvider";
    } else {
      targetUserId = post.user;
      reviewFieldToUpdate = "reviewedByWorker";
    }

    await User.findByIdAndUpdate(
      targetUserId,
      {
        $push: {
          ratings: {
            review,
            rating,
            from: userId,
            post: postId
          }
        }
      },
      { new: true }
    );

    const updatedUser = await User.findById(targetUserId);
    // Recalculate average rating
    if (updatedUser) {
      const ratings = updatedUser.ratings || [];
      const totalRating = ratings.reduce((sum, r) => sum + r.rating, 0);
      const averageRating = ratings.length ? totalRating / ratings.length : 0;

      updatedUser.totalRating = ratings.length;
      updatedUser.averageRating = Math.round(averageRating * 10) / 10; // round to 1 decimal
      await updatedUser.save();
    }

    // Mark post as reviewed
    post[reviewFieldToUpdate] = true;
    await post.save();

    return res.status(200).json({ message: "Review submitted successfully" });

  } catch (error) {
    console.error("❌ Error uploading review:", error);
    return res.status(500).json({ message: "Server error" });
  }
});


async function recordOtpRequest(ip, phoneNumber) {
  const ipKey = `otp:ip:${ip}`;
  const phoneKey = `otp:user:${phoneNumber}`;
  const phoneCooldownKey = `otp:cooldown:${phoneNumber}`;

  try {
    const pipeline = redis.pipeline();
    
    // Increment counters and set expiry
    [ipKey, phoneKey].forEach((key) => {
      pipeline.incr(key);
      pipeline.expire(key, OTP_EXPIRY_SECONDS);
    });
    
    // Set cooldown for phone number (prevents spam for same number)
    pipeline.setex(phoneCooldownKey, PHONE_COOLDOWN_SECONDS, '1');
    
    await pipeline.exec();
  } catch (error) {
    console.error('Error recording OTP request:', error);
    throw new Error('Failed to record OTP request');
  }
}

async function isOtpLimitExceeded(ip, phoneNumber) {
  try {
    const [ipCount, phoneCount, phoneCooldown] = await Promise.all([
      redis.get(`otp:ip:${ip}`),
      redis.get(`otp:user:${phoneNumber}`),
      redis.get(`otp:cooldown:${phoneNumber}`)
    ]);

    return {
      exceeded: (
        (ipCount && parseInt(ipCount) >= OTP_LIMIT) ||
        (phoneCount && parseInt(phoneCount) >= OTP_LIMIT)
      ),
      inCooldown: !!phoneCooldown,
      ipCount: ipCount ? parseInt(ipCount) : 0,
      phoneCount: phoneCount ? parseInt(phoneCount) : 0
    };
  } catch (error) {
    console.error('Error checking OTP limit:', error);
    // In case of Redis error, allow the request but log it
    return { exceeded: false, inCooldown: false, ipCount: 0, phoneCount: 0 };
  }
}

async function getRemainingOtpAttempts(ip, phoneNumber) {
  try {
    const [ipCount, phoneCount] = await Promise.all([
      redis.get(`otp:ip:${ip}`),
      redis.get(`otp:user:${phoneNumber}`)
    ]);

    const ipRemaining = OTP_LIMIT - (ipCount ? parseInt(ipCount) : 0);
    const phoneRemaining = OTP_LIMIT - (phoneCount ? parseInt(phoneCount) : 0);

    return Math.min(ipRemaining, phoneRemaining);
  } catch (error) {
    console.error('Error getting remaining attempts:', error);
    return OTP_LIMIT; // Default to full limit on error
  }
}

// Enhanced endpoint with better error handling and responses
app.post("/users/phoneNumber/send-otp", async (req, res) => {
  let { phoneNumber } = req.body;

  if (!phoneNumber) {
    return res.status(400).json({ message: 'Phone number is required', code: 'PHONE_REQUIRED' });
  }

  phoneNumber = phoneNumber.replace(/\D/g, "");

  if (!/^\d{10}$/.test(phoneNumber)) {
    return res.status(400).json({ message: 'Invalid phone number format. Please enter a 10-digit number.', code: 'INVALID_PHONE_FORMAT' });
  }

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || req.ip || 'unknown';

  try {
    const existingUser = await User.findOne({ phoneNumber });
    if (existingUser) {
      return res.status(409).json({ message: 'This number is already registered. Please try another number or sign in.', code: 'PHONE_EXISTS' });
    }

    const limitCheck = await isOtpLimitExceeded(ip, phoneNumber);

    if (limitCheck.inCooldown) {
      return res.status(429).json({ message: 'Please wait before requesting another OTP for this number.', code: 'COOLDOWN_ACTIVE', retryAfter: PHONE_COOLDOWN_SECONDS });
    }

    if (limitCheck.exceeded) {
      const remainingAttempts = await getRemainingOtpAttempts(ip, phoneNumber);
      return res.status(429).json({ message: 'Too many OTP requests. Please try again later.', code: 'RATE_LIMIT_EXCEEDED', details: { ipCount: limitCheck.ipCount, phoneCount: limitCheck.phoneCount, limit: OTP_LIMIT, remainingAttempts: Math.max(0, remainingAttempts), resetTime: new Date(Date.now() + (OTP_EXPIRY_SECONDS * 1000)).toISOString() } });
    }

    await recordOtpRequest(ip, phoneNumber);

    const otpSendUrl = `https://2factor.in/API/V1/${process.env.TWO_FACTOR_API_KEY}/SMS/+91${phoneNumber}/AUTOGEN/${OTP_TEMPLATE}`;
    const response = await axios.get(otpSendUrl);

    if (response.data.Status === 'Success') {
      const sessionId = response.data.Details;
      await redis.setex(`otp:session:${phoneNumber}`, OTP_EXPIRY_SECONDS, sessionId);

      const remainingAttempts = await getRemainingOtpAttempts(ip, phoneNumber);
      res.status(200).json({ 
        message: 'OTP sent successfully', 
        code: 'OTP_SENT', 
        data: {
          sessionId,
          phoneNumber: `+91${phoneNumber}`,
          remainingAttempts: Math.max(0, remainingAttempts - 1),
          expiresIn: 600
        }
      });
    } else {
      throw new Error(response.data.Details || 'Unknown error from 2Factor');
    }

  } catch (err) {
    console.error('OTP sending error:', err.message);
    res.status(500).json({ message: 'Failed to send OTP. Please try again.', code: 'OTP_SEND_FAILED' });
  }
});

// Optional: Add endpoint to check remaining attempts
app.get("/users/phoneNumber/otp-status", async (req, res) => {
  const { phoneNumber } = req.query;
  
  if (!phoneNumber) {
    return res.status(400).json({ message: 'Phone number is required' });
  }

  const cleanPhoneNumber = phoneNumber.replace(/\D/g, "");
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress;

  try {
    const limitCheck = await isOtpLimitExceeded(ip, cleanPhoneNumber);
    const remainingAttempts = await getRemainingOtpAttempts(ip, cleanPhoneNumber);

    res.status(200).json({
      phoneNumber: cleanPhoneNumber,
      canSendOtp: !limitCheck.exceeded && !limitCheck.inCooldown,
      remainingAttempts: Math.max(0, remainingAttempts),
      inCooldown: limitCheck.inCooldown,
      details: {
        ipCount: limitCheck.ipCount,
        phoneCount: limitCheck.phoneCount,
        limit: OTP_LIMIT
      }
    });
  } catch (error) {
    console.error('Error checking OTP status:', error);
    res.status(500).json({ message: 'Failed to check OTP status' });
  }
});

app.post("/users/phoneNumber/verify-otp", async (req, res) => {
  const { phoneNumber, otp ,userId } = req.body;

  try {
    const storedSessionId = await redis.get(`otp:session:${phoneNumber}`);
    if (!storedSessionId ) {
      return res.status(400).json({ message: 'Invalid or expired OTP session.' });
    }

    const verifyUrl = `https://2factor.in/API/V1/${process.env.TWO_FACTOR_API_KEY}/SMS/VERIFY/${storedSessionId}/${otp}`;
    const response = await axios.get(verifyUrl);

    if (response.data.Status === 'Success' && response.data.Details === 'OTP Matched') {
      await User.findByIdAndUpdate(userId, { phoneNumber: phoneNumber, 'verified.phoneNumber': true });
      await redis.del(`otp:session:${phoneNumber}`);
      res.status(200).json({ message: 'OTP verified' });
    } else {
      res.status(400).json({ message: 'Invalid OTP' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
});

// Enhanced Email OTP rate limiting functions with better error handling and features

async function recordEmailOtpRequest(ip, email) {
  const ipKey = `email_otp:ip:${ip}`;
  const emailKey = `email_otp:user:${email.toLowerCase()}`;
  const emailCooldownKey = `email_otp:cooldown:${email.toLowerCase()}`;

  try {
    const pipeline = redis.pipeline();
    
    // Increment counters and set expiry
    [ipKey, emailKey].forEach((key) => {
      pipeline.incr(key);
      pipeline.expire(key, EMAIL_OTP_EXPIRY_SECONDS);
    });
    
    // Set cooldown for email (prevents spam for same email)
    pipeline.setex(emailCooldownKey, EMAIL_COOLDOWN_SECONDS, '1');
    
    await pipeline.exec();
  } catch (error) {
    console.error('Error recording email OTP request:', error);
    throw new Error('Failed to record email OTP request');
  }
}

async function isEmailOtpLimitExceeded(ip, email) {
  try {
    const normalizedEmail = email.toLowerCase();
    const [ipCount, emailCount, emailCooldown] = await Promise.all([
      redis.get(`email_otp:ip:${ip}`),
      redis.get(`email_otp:user:${normalizedEmail}`),
      redis.get(`email_otp:cooldown:${normalizedEmail}`)
    ]);

    return {
      exceeded: (
        (ipCount && parseInt(ipCount) >= EMAIL_OTP_LIMIT) ||
        (emailCount && parseInt(emailCount) >= EMAIL_OTP_LIMIT)
      ),
      inCooldown: !!emailCooldown,
      ipCount: ipCount ? parseInt(ipCount) : 0,
      emailCount: emailCount ? parseInt(emailCount) : 0
    };
  } catch (error) {
    console.error('Error checking email OTP limit:', error);
    // In case of Redis error, allow the request but log it
    return { exceeded: false, inCooldown: false, ipCount: 0, emailCount: 0 };
  }
}

async function getRemainingEmailOtpAttempts(ip, email) {
  try {
    const normalizedEmail = email.toLowerCase();
    const [ipCount, emailCount] = await Promise.all([
      redis.get(`email_otp:ip:${ip}`),
      redis.get(`email_otp:user:${normalizedEmail}`)
    ]);

    const ipRemaining = EMAIL_OTP_LIMIT - (ipCount ? parseInt(ipCount) : 0);
    const emailRemaining = EMAIL_OTP_LIMIT - (emailCount ? parseInt(emailCount) : 0);

    return Math.min(ipRemaining, emailRemaining);
  } catch (error) {
    console.error('Error getting remaining email attempts:', error);
    return EMAIL_OTP_LIMIT; // Default to full limit on error
  }
}

// Enhanced email validation function
function validateEmail(email) {
  // More comprehensive email validation
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  if (!emailRegex.test(email)) {
    return { valid: false, message: 'Invalid email format' };
  }
  
  if (email.length > 254) {
    return { valid: false, message: 'Email address too long' };
  }
  
  // Check for common disposable email domains (optional)
  const disposableDomains = [
    'temp-mail.org', '10minutemail.com', 'guerrillamail.com', 
    'mailinator.com', 'yopmail.com', 'throwaway.email'
  ];
  
  const domain = email.split('@')[1]?.toLowerCase();
  if (disposableDomains.includes(domain)) {
    return { valid: false, message: 'Disposable email addresses are not allowed' };
  }
  
  return { valid: true };
}

// Enhanced endpoint with better error handling and responses
app.post("/users/email/send-otp", async (req, res) => {
  let { email , isSignUp = false} = req.body;

  const checkEmailExists = async (email) => {
    const normalizedEmail = email.trim().toLowerCase();
    return await User.findOne({ email: normalizedEmail });
  }
  if( isSignUp && await checkEmailExists(email)) {
    return res.status(400).json({ message: 'Email already exists', code: 'EMAIL_EXISTS' });
  }
  if(!isSignUp && !(await checkEmailExists(email))) {
    return res.status(404).json({ message: 'Email not found', code: 'EMAIL_NOT_FOUND' });
  }
  if (!email) {
    return res.status(400).json({ message: 'Email required', code: 'EMAIL_REQUIRED' });
  }
  
  email = email.trim().toLowerCase();
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';

  const { valid, message } = validateEmail(email);
  if (!valid) return res.status(400).json({ message, code: 'INVALID_EMAIL_FORMAT' });

  const limitCheck = await isEmailOtpLimitExceeded(ip, email);
  if (limitCheck.inCooldown || limitCheck.exceeded) {
    return res.status(429).json({
      message: 'Too many OTP requests',
      code: 'RATE_LIMIT',
      details: limitCheck
    });
  }

  try {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await redis.setex(`email_otp:code:${email}`, EMAIL_OTP_EXPIRY_SECONDS, otp);

    await recordEmailOtpRequest(ip, email);
    await sendEmailOtp(email, otp);

    const remaining = await getRemainingEmailOtpAttempts(ip, email);
    res.status(200).json({
      message: "OTP sent successfully",
      code: "OTP_SENT",
      data: {
        email,
        remainingAttempts: remaining - 1,
        expiresIn: EMAIL_OTP_EXPIRY_SECONDS
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to send OTP', code: err.message });
  }
});

// Optional: Add endpoint to check remaining email OTP attempts
app.get("/users/email/otp-status", async (req, res) => {
  const { email } = req.query;
  
  if (!email) {
    return res.status(400).json({ message: 'Email address is required' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const emailValidation = validateEmail(normalizedEmail);
  
  if (!emailValidation.valid) {
    return res.status(400).json({ message: emailValidation.message });
  }

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress;

  try {
    const limitCheck = await isEmailOtpLimitExceeded(ip, normalizedEmail);
    const remainingAttempts = await getRemainingEmailOtpAttempts(ip, normalizedEmail);

    res.status(200).json({
      email: normalizedEmail,
      canSendOtp: !limitCheck.exceeded && !limitCheck.inCooldown,
      remainingAttempts: Math.max(0, remainingAttempts),
      inCooldown: limitCheck.inCooldown,
      cooldownSeconds: limitCheck.inCooldown ? EMAIL_COOLDOWN_SECONDS : 0,
      details: {
        ipCount: limitCheck.ipCount,
        emailCount: limitCheck.emailCount,
        limit: EMAIL_OTP_LIMIT
      }
    });
  } catch (error) {
    console.error('Error checking email OTP status:', error);
    res.status(500).json({ message: 'Failed to check email OTP status' });
  }
});

// Optional: Combined status endpoint for both phone and email
app.get("/users/otp-status", async (req, res) => {
  const { phoneNumber, email } = req.query;
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress;

  try {
    const results = {};

    if (phoneNumber) {
      const cleanPhoneNumber = phoneNumber.replace(/\D/g, "");
      if (/^\d{10}$/.test(cleanPhoneNumber)) {
        const limitCheck = await isOtpLimitExceeded(ip, cleanPhoneNumber);
        const remainingAttempts = await getRemainingOtpAttempts(ip, cleanPhoneNumber);
        
        results.phone = {
          phoneNumber: cleanPhoneNumber,
          canSendOtp: !limitCheck.exceeded && !limitCheck.inCooldown,
          remainingAttempts: Math.max(0, remainingAttempts),
          inCooldown: limitCheck.inCooldown
        };
      }
    }

    if (email) {
      const normalizedEmail = email.trim().toLowerCase();
      const emailValidation = validateEmail(normalizedEmail);
      
      if (emailValidation.valid) {
        const limitCheck = await isEmailOtpLimitExceeded(ip, normalizedEmail);
        const remainingAttempts = await getRemainingEmailOtpAttempts(ip, normalizedEmail);
        
        results.email = {
          email: normalizedEmail,
          canSendOtp: !limitCheck.exceeded && !limitCheck.inCooldown,
          remainingAttempts: Math.max(0, remainingAttempts),
          inCooldown: limitCheck.inCooldown
        };
      }
    }

    res.status(200).json(results);
  } catch (error) {
    console.error('Error checking OTP status:', error);
    res.status(500).json({ message: 'Failed to check OTP status' });
  }
});

app.post("/users/email/verify-otp", async (req, res) => {
  const { email, otp, userId } = req.body;

  try {
    const cachedOtp = await redis.get(`email_otp:code:${email.toLowerCase()}`);
    if (!cachedOtp) {
      return res.status(410).json({ message: 'OTP expired or not found', code: 'OTP_NOT_FOUND' });
    }

    if (cachedOtp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP', code: 'INVALID_OTP' });
    }

    await User.findByIdAndUpdate(userId, {
      email: email.toLowerCase(),
      'verified.email': true
    });

    await redis.del(`email_otp:code:${email.toLowerCase()}`);
    res.status(200).json({ message: 'Email verified', code: 'EMAIL_VERIFIED' });
  } catch (err) {
    console.error("Verify error:", err);
    res.status(500).json({ message: 'Verification failed', code: 'EMAIL_VERIFY_ERROR' });
  }
});

app.post("/users/change-password", async (req, res) => {
  const { oldPassword, newPassword , email , otpVerified} = req.body;
  if (!newPassword || !email) {
    return res.status(400).json({ message: "Missing required fields" });
  }
  try {
      const user = await User.findOne({ email: email}); 
      if (!user) {
          return res.status(404).json({ message: "User not found." });
      }
      const isAuth = user.isOAuth;
      if (isAuth ) {
          const hashedPassword = await bcrypt.hash(newPassword, 10);
          user.password = hashedPassword;
          user.isOAuth = false; // Convert OAuth user to regular user
          await user.save();
          return res.status(200).json({ message: "Password created successfully for OAuth user." });
      }

      if (!oldPassword && !otpVerified){
          return res.status(400).json({ message: "Old password is required for non-OAuth users." });
      }
      // Check if old password matches
      if (!otpVerified) {
          const isMatch = await bcrypt.compare(oldPassword, user.password);
          if (!isMatch) {
              return res.status(400).json({ message: "Old password is incorrect." });
          }
      }

      // Hash new password and update it
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      user.password = hashedNewPassword;
      await user.save();

      res.status(200).json({ message: "Password changed successfully." });
  } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to change password." });
  }
});

app.post('/posts/save', async (req, res) => {
  const { postId, userId } = req.body;
  console.log("Saving post:", postId, "for user:", userId);
  try {
    const user = await User.findById(userId);
    if (user.savedPosts.includes(postId)) {
      return res.status(400).send('Post already saved');
    }
    user.savedPosts.push(postId);
    await user.save();
    res.status(200).json( user.savedPosts);
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
});

app.delete('/posts/unsave', async (req, res) => {
  const { postId, userId } = req.body;
  try {
    const user = await User.findById(userId);
    user.savedPosts = user.savedPosts.filter(id => id.toString() !== postId);
    await user.save();
    res.status(200).json( user.savedPosts);
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
});


// Get unseen message counts
app.get('/api/unseen-counts', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    console.log("userId in /api/unseen-counts:", userId, "type:", typeof userId);
    
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.log("Invalid user ID detected:", userId);
      return res.status(400).json({ error: `Invalid user ID: ${userId}` });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    const unseenCounts = await Message.aggregate([
      {
        $match: {
          receiver: userObjectId,
          seenBy: { $ne: userObjectId },
          deletedFor: { $ne: userObjectId }
        }
      },
      {
        $group: {
          _id: '$sender',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const result = {};
    unseenCounts.forEach(item => {
      result[item._id.toString()] = item.count;
    });
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching unseen counts:', error);
    res.status(500).json({ error: error.message });
  }
});

// Mark messages as seen
app.put('/api/mark-seen/:userId', verifyToken, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const otherUserId = req.params.userId;

    if (!mongoose.Types.ObjectId.isValid(currentUserId) || !mongoose.Types.ObjectId.isValid(otherUserId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const currentUserObjectId = new mongoose.Types.ObjectId(currentUserId);
    const otherUserObjectId = new mongoose.Types.ObjectId(otherUserId);

    await Message.updateMany(
      { sender: otherUserObjectId, receiver: currentUserObjectId, seenBy: { $ne: currentUserObjectId } },
      { $addToSet: { seenBy: currentUserObjectId } }
    );

    // Emit socket event to update unseen counts
    io.to(currentUserId).emit('markMessagesSeen', { userId: otherUserId });

    res.status(200).json({ message: 'Messages marked as seen' });
  } catch (error) {
    console.error('Error marking messages as seen:', error);
    res.status(500).json({ error: error.message });
  }
});


app.delete('/api/conversation/:userId', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const withUserId = req.params.userId;

    if (!mongoose.Types.ObjectId.isValid(withUserId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    // Find messages between the two users
    const messages = await Message.find({
      $or: [
        { sender: userId, receiver: withUserId },
        { sender: withUserId, receiver: userId }
      ]
    });

    // Mark messages as deleted for current user
    const bulkOps = messages
      .filter(msg => !msg.deletedFor.includes(userId))
      .map(msg => ({
        updateOne: {
          filter: { _id: msg._id },
          update: { $addToSet: { deletedFor: userId } }
        }
      }));

    if (bulkOps.length > 0) {
      await Message.bulkWrite(bulkOps);
    }
    console.log('Marked messages as deleted for user:', userId);
    res.status(200).json({ message: 'Conversation deleted for user' });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/api/messages/:userId', verifyToken, async (req, res) => {
  try {
    const senderId = req.user.id;
    const receiverId = req.params.userId;

    const messages = await Message.find({
      $or: [
        { sender: senderId, receiver: receiverId },
        { sender: receiverId, receiver: senderId },
      ],
    })
      .sort({ createdAt: 1 })
      .populate('sender', 'username userImage verified blockedUsers')
      .populate('receiver', 'username userImage verified blockedUsers');

    res.status(200).json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Failed to fetch messages' });
  }
});


app.get("/conversations", verifyToken, async (req, res) => {
  const userId = req.user.id;
  const oid = new mongoose.Types.ObjectId(userId); 

  try {
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [
            { sender: oid },
            { receiver: oid }
          ]
        }
      },
      {
        $project: {
          otherUser: {
            $cond: [
              { $eq: ["$sender", oid] },
              "$receiver",
              "$sender"
            ]
          },
          createdAt: 1
        }
      },
      {
        $group: {
          _id: "$otherUser",
          lastMessageTime: { $max: "$createdAt" }
        }
      },
      {
        $sort: { lastMessageTime: -1 }
      }
    ]);

    const userIds = conversations.map(c => c._id);
    const users = await User.find(
      { _id: { $in: userIds } },
      "_id username userImage verified"
    );

    const result = conversations.reduce((acc, c) => {
      const u = users.find(user => user._id.toString() === c._id.toString());
      if (u) {
        acc.push({ user: u, lastMessageTime: c.lastMessageTime });
      }
      return acc;
    }, []);

    res.status(200).json(result);
  } catch (error) {
    console.error("Failed to fetch conversations:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

app.get('/api/user/connections', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid user ID' 
      });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Find the user with populated connections
    const user = await User.findById(userId)
      .populate({
        path: 'connections.user',
        select: 'username userImage userBio verified averageRating totalRating'
      })
      .select('connections');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const enhancedConnections = await Promise.all(
      user.connections.map(async (connection) => {
        const connectedUser = connection.user;

        // If the connected user was deleted
        const isDeleted = !connectedUser || !connectedUser._id;

        const otherUserId = isDeleted ? connection.user?._id || connection.user : connectedUser._id;

        // Get the most recent message between users
        const lastMessage = await Message.findOne({
          $or: [
            { sender: userId, receiver: otherUserId },
            { sender: otherUserId, receiver: userId }
          ],
          deletedFor: { $ne: userObjectId }
        })
        .sort({ createdAt: -1 })
        .select('text type createdAt sender receiver data seenBy');

        // Count unseen messages
        const unseenCount = await Message.countDocuments({
          sender: otherUserId,
          receiver: userId,
          seenBy: { $ne: userObjectId },
          deletedFor: { $ne: userObjectId }
        });

        return {
          _id: connection._id,
          user: isDeleted
            ? {
                _id: otherUserId,
                username: "Deleted User",
                userImage: null,
                userBio: null,
                verified: false,
                averageRating: 0,
                totalRating: 0
              }
            : connectedUser,
          request: connection.request,
          lastMessage,
          unseenCount,
          createdAt: connection.createdAt,
          updatedAt: connection.updatedAt || connection.createdAt
        };
      })
    );

    // Sort by activity
    enhancedConnections.sort((a, b) => {
      const aTime = a.lastMessage?.createdAt || a.createdAt;
      const bTime = b.lastMessage?.createdAt || b.createdAt;
      return new Date(bTime) - new Date(aTime);
    });

    res.status(200).json({
      success: true,
      connections: enhancedConnections
    });

  } catch (error) {
    console.error('Error fetching user connections:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

app.get("/users/saved", verifyToken, async (req, res) => {
  const { userId } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 5;
  const skip = (page - 1) * limit;

  if (!userId) return res.status(400).json({ message: "userId is missing" });

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const savedIds = user.savedPosts || [];
    const query = { _id: { $in: savedIds } , isDeleted: false  };
    const totalPosts = await Post.countDocuments(query);

    const posts = await Post.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit)
      .populate({
        path: 'user',
        select: 'username userImage verified blockedUsers _id ratings',
        populate: { path: 'ratings.from', select: 'username userImage verified blockedUsers _id' }
      })
      .populate({ path: 'bids.user', select: 'username userImage verified _id averageRating totalRating' })
      .populate({ path: 'comments.user', select: 'username userImage verified _id' })
      .populate({ path: 'comments.replies.user', select: 'username userImage verified _id' });

    // **CORRECTION:** Apply filtering before anonymizing and sending
    const filteredPosts = filterDeletedSubdocuments(posts);
    const modifiedPosts = anonymizeBidders(filteredPosts, req.user.id);

    res.status(200).json({
      posts: modifiedPosts,
      pagination: { currentPage: page, limit, totalPosts, totalPages: Math.ceil(totalPosts / limit), hasMore: (page * limit) < totalPosts }
    });
  } catch (error) {
    console.error("❌ Error while loading posts user has saved:", error);
    res.status(500).json({ message: error.message });
  }
});

app.get("/user/username/:username", async (req, res) => {
  const { username } = req.params;
  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(user);
  } catch (error) {
    console.error("❌ Error while loading user:", error);
    res.status(500).json({ message: error.message });
  }
});

app.get("/users/:id", async (req, res) => {
  try {
    const userId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid user ID format" });
    }

    const user = await User.findById(userId).populate(
     { path: 'ratings.from',
      select: 'username userImage verified blockedUsers _id'}
    );
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(user);
  } catch (error) {
    console.error("❌ Error while loading user:", error);
    res.status(500).json({ message: error.message });
  }
});

app.get("/api/post/:postId", verifyToken, async (req, res) => {
  const { postId } = req.params;
  console.log("Post ID:", postId);

  try {
    const post = await Post.findById(postId)
      .populate('user', 'username userImage verified blockedUsers _id')
      .populate('bids.user', 'username userImage verified _id')
      .populate('comments.user', 'username userImage verified _id')
      .populate('comments.replies.user', 'username userImage verified _id');

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const currentUserId = req.user.id;
    const isPostOwner = post.user._id.toString() === currentUserId;

    // ✅ Filter out soft-deleted bids
    const visibleBids = post.bids.filter(bid => !bid.isDeleted);

    // ✅ Anonymize bids
    const updatedBids = visibleBids.map(bid => {
      const isBidder = bid.user._id.toString() === currentUserId;

      if (!isPostOwner && !isBidder) {
        return {
          ...bid.toObject(),
          user: {
            ...bid.user.toObject(),
            username: "Anonymous",
            userImage: null,
            _id: undefined
          }
        };
      }

      return bid;
    });

    // ✅ Filter out soft-deleted comments and replies
    const visibleComments = post.comments
      .filter(comment => !comment.isDeleted)
      .map(comment => ({
        ...comment.toObject(),
        replies: (comment.replies || []).filter(reply => !reply.isDeleted),
      }));

    // ✅ Return post with updated, filtered content
    const updatedPost = {
      ...post.toObject(),
      bids: updatedBids,
      comments: visibleComments
    };

    res.status(200).json(updatedPost);
  } catch (error) {
    console.error("❌ Error while loading post:", error);
    res.status(500).json({ message: error.message });
  }
});

// POST /api/block/:userId
app.post('/api/block/:userId', verifyToken, async (req, res) => {
  try {
    const blockerId = req.user.id;
    const blockedId = req.params.userId;

    if (blockerId === blockedId) {
      return res.status(400).json({ message: "You cannot block yourself." });
    }

    await User.findByIdAndUpdate(blockerId, {
      $addToSet: { blockedUsers: blockedId },
    });

    res.status(200).json({ message: "User blocked successfully." });
  } catch (error) {
    console.error("Error blocking user:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

// POST /api/unblock/:userId
app.post('/api/unblock/:userId', verifyToken, async (req, res) => {
  try {
    const blockerId = req.user.id;
    const blockedId = req.params.userId;

    await User.findByIdAndUpdate(blockerId, {
      $pull: { blockedUsers: blockedId },
    });

    res.status(200).json({ message: "User unblocked successfully." });
  } catch (error) {
    console.error("Error unblocking user:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

app.post('/api/report/:userId', verifyToken, async (req, res) => {
  const { userId } = req.params;
  const { text, postId, bidId, commentId } = req.body;

  try {
    const isSelfReport = req.user.id === userId;

    const report = new Report({
      reporter: req.user.id,
      reportedUser: isSelfReport ? null : userId,
      text: text || "",
      post: postId || null,
      bid: bidId || null,
      comment: commentId || null,
    });

    await report.save();
    res.status(201).json({ message: "Report submitted successfully." });
  } catch (err) {
    console.error("Report error:", err);
    res.status(500).json({ message: "Failed to submit report." });
  }
});


app.post('/api/notify', verifyToken, async (req, res) => {
  const { type, postId, senderId, userId, postDescription, bidId , commentId , replyId } = req.body;

  if (!type || !senderId) {
    return res.status(400).json({ message: 'Missing required fields: type and sender.' });
  }

  try {
    const notification = {
      type,
      postId,
      sender: senderId,
      createdAt: new Date(),
      postDescription,
      seen: false,
      ...(type === 'bid' && bidId ? { bidId } : {}),
      ...(type === 'comment' && commentId ? { commentId } : {}),
      ...(type === 'Reply' && replyId ? { replyId } : {}),
      ...(type === 'Hired' && bidId ? { bidId } : {})
    };

    await User.findByIdAndUpdate(userId, {
      $push: { notifications: notification },
    });

    const user = await User.findById(userId);
    
    const condition1 = user?.allowNotifications?.bids && ['bid', 'Hired'].includes(type);
    const condition2 = user?.allowNotifications?.comments && ['comment', 'Reply'].includes(type);

    const shouldNotify = condition1 || condition2;

    if (shouldNotify) {
      io.to(userId).emit('receiveNotification', notification);
    }

    res.status(201).json({ message: 'Notification sent.' });
  } catch (err) {
    console.error('Notification error:', err);
    res.status(500).json({ message: 'Failed to send notification.' });
  }
});

app.get('/api/notifications', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate({
        path: 'notifications.sender',
        select: 'username userImage',
      })
      .lean();

    if (!user) return res.status(404).json({ message: 'User not found.' });

    const notifications = user.notifications;

    // 🔹 Gather unique postIds we need to fetch
    const postIdsSet = new Set();
    for (const notif of notifications) {
      if (notif.postId) postIdsSet.add(notif.postId.toString());
    }

    const postIds = [...postIdsSet];
    const posts = await Post.find({ _id: { $in: postIds } }).lean();

    // 🔹 Map for quick access
    const postMap = {};
    posts.forEach((p) => (postMap[p._id.toString()] = p));

    // 🔹 Build enriched notifications
    const enriched = notifications.map((notif) => {
      const base = {
        ...notif,
        sender: notif.sender,
      };

      const post = postMap[notif.postId?.toString()];
      if (!post) return base;

      // 🔸 BID
      if (notif.type === 'bid' && notif.bidId) {
        const bid = post.bids?.find((b) => b._id.toString() === notif.bidId.toString());
        if (bid) {
          base.bidText = bid.BidText || '';
          base.bidAmount = bid.BidAmount || 0;
        }
      }

      // 🔸 COMMENT
      if (notif.type === 'comment' && notif.commentId) {
        const comment = post.comments?.find((c) => c._id.toString() === notif.commentId.toString());
        if (comment) {
          base.commentText = comment.commentText;
        }
      }

      // 🔸 REPLY
      if (notif.type === 'Reply' && notif.replyId) {
        for (const comment of post.comments || []) {
          const reply = comment.replies?.find(
            (r) => r._id.toString() === notif.replyId.toString()
          );
          if (reply) {
            base.commentText = reply.replyText;
            break;
          }
        }
      }

      return base;
    });

    res.json({ notifications: enriched });
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ message: 'Failed to fetch notifications.' });
  }
});

app.put('/api/notifications/mark-seen', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    user.notifications.forEach((n) => (n.seen = true));
    await user.save();

    // Emit socket event to the user
    io.to(req.user.id).emit('notificationsMarkedSeen');

    res.json({ message: 'Notifications marked as seen.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update notifications.' });
  }
});

app.get('/api/notifications/unseen-count', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('notifications notificationsAllowed');
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const { bids, comments } = user.allowNotifications || {};

    const unseenCount = user.notifications.filter((n) => {
      if (n.seen) return false;

      // Exclude bid/hired if user disabled bid notifications
      if (!bids && (n.type === 'bid' || n.type === 'hired')) {
        return false;
      }

      // Exclude comment/reply if user disabled comment notifications
      if (!comments && (n.type === 'comment' || n.type === 'reply')) {
        return false;
      }

      return true;
    }).length;
    console.log("Unseen notifications count:", unseenCount);
    res.json({ unseenCount });

  } catch (err) {
    console.error('Error fetching unseen notifications count:', err);
    res.status(500).json({ message: 'Failed to fetch unseen notifications count.' });
  }
});

async function cleanupOldNotifications() {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30); // 7 days ago
    
    // Update all users to remove old seen notifications
    await User.updateMany(
      {},
      {
        $pull: {
          notifications: {
            seen: true,
            createdAt: { $lt: cutoffDate }
          }
        }
      }
    );
    
    console.log('Old notifications cleaned up successfully');
  } catch (error) {
    console.error('Error cleaning up notifications:', error);
  }
}

cron.schedule('0 2 * * *', cleanupOldNotifications);

app.delete('/users/delete', verifyToken, async (req, res) => {
  const userId = req.user.id;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid user ID" });
  }

  try {
    // 🧠 1. Fetch full user data
    const userToDelete = await User.findById(userId).lean();
    if (!userToDelete) {
      return res.status(404).json({ message: "User not found" });
    }

    // 🧠 2. Backup full data in DeletedUser
    await DeletedUser.create({
      ...userToDelete,
      originalUserId: userToDelete._id
    });

    // 3. Proceed with rest of the deletion steps (posts, bids, comments, etc.)

    // 🔁 Same logic for preserving winning bids
    const postsWithUserBids = await Post.find({ "bids.user": userId });

    for (const post of postsWithUserBids) {
      const updatedBids = post.bids.filter(bid => {
        if (bid.user.toString() !== userId.toString()) return true;
        if (post.winningBidId && bid._id.toString() === post.winningBidId.toString()) return true;
        return false;
      });

      post.bids = updatedBids;
      await post.save();
    }
      // 1. Delete all posts by user
    await Post.deleteMany({ user: userId });
    // Delete user comments and replies
    await Post.updateMany({}, { $pull: { comments: { user: userId } } });
    await Post.updateMany(
      { "comments.replies.user": userId },
      { $pull: { "comments.$[].replies": { user: userId } } }
    );

    // Remove user from notifications and blocked lists
    await User.updateMany({}, {
      $pull: {
        notifications: {
          $or: [{ sender: userId }, { to: userId }]
        },
        blockedUsers: userId
      }
    });

    // Delete the user
    await User.findByIdAndDelete(userId);

    // Clear the cookie
    res.clearCookie("accessToken", {
      httpOnly: true,
      secure: true,
      sameSite: "None"
    });

    return res.status(200).json({ message: "Account deleted and backed up successfully." });

  } catch (error) {
    console.error("Error during deletion:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});


mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log("Connection established");
    
    server.listen(PORT,'0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(() => console.log("Connection failed"));
