const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ['text', 'link', 'post', 'image', 'media'],
      default: 'text',
      required: true,
    },
    text: {
      type: String,
      required: function() {
        return this.type === 'text' || this.type === 'link';
      },
    },
    data: {
      postId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post",
        required: function() {
          return this.type === 'post';
        },
      },
      url: {
        type: String,
        required: function() {
          return this.type === 'image' || this.type === 'media' || this.type === 'link';
        },
      },
    },
    seenBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      }
    ],
    deletedFor: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }]
  },
  { timestamps: true }
);

const Message = mongoose.model('Message', messageSchema);
module.exports = Message;