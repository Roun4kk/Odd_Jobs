const mongoose = require('mongoose');

const PostSchema = mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  postDescription: { type: String, required: [true, 'Description is required'] },
  mediaUrls: { type: [String], default: [] },
  bids: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      BidText: { type: String },
      BidAmount: { type: Number, required: [true, 'Bid Amount is required'] },
      isDeleted: { type: Boolean, default: false },
      timestamp: { type: Date, default: Date.now },
    }
  ],
  comments: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      commentText: { type: String, required: [true, 'Comment is required'] },
      isDeleted: { type: Boolean, default: false },
      replies: [
        {
          user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
          replyText: String,
          isDeleted: { type: Boolean, default: false },
          timestamp: { type: Date, default: Date.now },
        }
      ],
      timestamp: { type: Date, default: Date.now },
    }
  ],
  minimumBid: {
    type: Number,
    default: 0,
    min: 0,
  },
  maximumBid: {
    type: Number,
    default: null, 
    min: 0,
  },
  selectedWinner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  winningBidId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post', 
  },
  reviewedByProvider: {
  type: Boolean,
  default: false,
  },
  reviewedByWorker: {
    type: Boolean,
    default: false,
  },
  providerConfirmed:{
    type: Boolean,
    default:false ,
  },
  workerConfirmed : {
    type: Boolean ,
    default : false ,
  },
  isDeleted: { type: Boolean, default: false },
  status: {
    type: String,
    enum: ['open', 'winnerSelected', 'completed' , 'closed'],
    default: 'open',
  }
}, { timestamps: true });


const Post = mongoose.model('Post', PostSchema);
module.exports = Post;
