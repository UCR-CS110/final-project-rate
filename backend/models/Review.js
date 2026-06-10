const mongoose = require("mongoose");

const replySchema = new mongoose.Schema(
  {
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    username: {
      type: String,
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

const reviewSchema = new mongoose.Schema(
  {
    professorId: {
      type: String,
      required: true,
      trim: true,
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    username: {
      type: String,
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
    difficulty: {
      type: Number,
      min: 1,
      max: 5,
    },
    quality: {
      type: Number,
      min: 1,
      max: 5,
    },
    engagement: {
      type: Number,
      min: 1,
      max: 5,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },
    tags: [{
      type: String,
      trim: true,
    }],
    upvotes: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }],
    downvotes: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }],
    status: {
      type: String,
      enum: ["active", "flagged", "deleted"],
      default: "active",
    },
    flaggedBy: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }],
    moderationReason: {
      type: String,
      default: "",
    },
    replies: [replySchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Review", reviewSchema);
