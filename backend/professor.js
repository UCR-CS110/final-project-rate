const mongoose = require("mongoose");

const professorSchema = new mongoose.Schema({
  netId: {
    type: String,
    required: true,
    unique: true,
    sparse: true,
    trim: true,
  },
  name: {
    type: String,
    required: true,
  },
  department: {
    type: String,
    default: "",
  },
  organization: {
    type: String,
    default: "",
  },
  title: {
    type: String,
    default: "",
  },
  profileUrl: {
    type: String,
    required: true,
  },
  courses: [{
    type: String,
  }],
  claimStatus: {
    type: String,
    enum: ["none", "pending", "approved", "rejected"],
    default: "none",
  },
  claimRequestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  claimedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  claimNote: {
    type: String,
    default: "",
  },
});

const Professor = mongoose.model("Professor", professorSchema);

module.exports = Professor;
