const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema({
  reporter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  reportedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default:  null,
  },
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Post", // assuming your posts are in a model named 'Post'
    default: null,
  },
  bid: {
    type:mongoose.Schema.Types.ObjectId,
    ref: "Post",
    default:  null,
  },
  comment:  {
    type:mongoose.Schema.Types.ObjectId,
    ref: "Post",
    default:  null,
  },
  text: {
    type: String,
    default: "",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Report", reportSchema);
