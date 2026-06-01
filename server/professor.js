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
});

const Professor = mongoose.model("Professor", professorSchema);

module.exports = Professor;

