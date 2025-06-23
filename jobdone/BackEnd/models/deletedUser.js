const mongoose = require('mongoose');

const DeletedUserSchema = mongoose.Schema({
  originalUserId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true,
  },
  username: String,
  userImage: String,
  userBio: String,
  userSkills: [String],
  email: String,
  password: String,
  averageRating: Number,
  totalRating: Number,
  isOAuth: Boolean,
  googleId: String,
  googlePhotoUrl: String,
  linkedinId: String,
  postIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
  bidIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
  savedPosts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
  ratings: [{
    from: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    rating: Number,
    review: String,
    post: { type: mongoose.Schema.Types.ObjectId, ref: "Post" },
    createdAt: { type: Date }
  }],
  notifications: [{
    type: String,
    postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    message: String,
    createdAt: Date,
    postDescription: String,
    seen: Boolean,
  }],
  allowNotifications: {
    comments: Boolean,
    bids: Boolean
  },
  phoneNumber: String,
  verified: {
    email: Boolean,
    phoneNumber: Boolean
  },
  connections: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    request: Boolean,
    lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: "Message" }
  }],
  blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
}, { timestamps: true });

module.exports = mongoose.model("DeletedUser", DeletedUserSchema);
