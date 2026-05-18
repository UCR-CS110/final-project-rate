import mongoose from "mongoose";

const professorSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    department: {
        type: String,
        required: true
    },
    courses: [{
        type: String,
        ref: "Course",
        required: true
    }]
});

const Professor = mongoose.model("Professor", professorSchema);
export default Professor;