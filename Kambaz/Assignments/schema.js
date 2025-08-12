import mongoose from "mongoose";

const assignmentSchema = new mongoose.Schema(
    {
        _id: String,
        title: { type: String, required: true },
        course: { type: String, ref: "CourseModel", required: true },
        description: String,
        points: { type: Number, default: 100 },
        dueDate: Date,
        availableFrom: Date,
        availableUntil: Date,
    },
    { collection: "assignments" }
);

export default assignmentSchema;
