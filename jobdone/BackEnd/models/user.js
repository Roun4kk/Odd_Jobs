const mongoose = require('mongoose');

const UserSchema = mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
    },
    userImage: {
      type: String,
      default: "https://res.cloudinary.com/jobdone/image/upload/v1743801776/posts/bixptelcdl5h0m7t2c8w.jpg",
    },
    userBio: {
      type: String,
      default: "",
    },
    userSkills: {
      type: [String],
      default: [],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
    },
    password: {
      type: String,
      required: function () {
        return !this.isOAuth;
      },
      default: "",
    },
    averageRating: {
      type: Number,
      default: 0,
    },
    totalRating: {
      type: Number,
      default: 0,
    },
    // OAuth fields
    isOAuth: {
      type: Boolean,
      default: false,
    },
    googleId: {
      type: String,
      sparse: true,
      unique: true,
    },
    googlePhotoUrl: {
      type: String
    },
    linkedinId: {
      type: String,
      sparse: true,
      unique: true,
    },

    // Job-related references
    postIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      default: [],
    }],
    bidIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      default: [],
    }],
    savedPosts: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      default: [],
    }],
    ratings: [
      {
        from: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        rating: {
          type: Number,
          required: true,
          min: 1,
          max: 5,
        },
        review: {
          type: String,
          maxlength: 500,
          default: "",
        },
        post: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Post",
          required: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        }
      }
    ],

    // Other fields
    notifications: [
      {
        type: {
          type: String, // e.g. 'comment', 'reply', 'bid', 'message', 'connection'
          required: true,
        },
        postId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Post',
        },
        sender: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        message: {
          type: String,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
        postDescription: { 
          type: String, 
          required: [true, 'Description is required'] 
        },
        seen: {
          type: Boolean,
          default: false,
        },
      }
    ],
    allowNotifications: {
      comments: {
        type: Boolean,
        default: true,
      },
      bids:{
        type: Boolean,
        default: true,
      }
    },

    phoneNumber: {
      type: String,
      default: "",
    },
    verified: {
      email: {
        type: Boolean,
        default: false,
      },
      phoneNumber: {
        type: Boolean,
        default: false,
      },
    },
    connections: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        request: Boolean,
        lastMessage: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Message",
        },
      },
    ],
    blockedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: [],
      },
    ],
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", UserSchema);
module.exports = User;
