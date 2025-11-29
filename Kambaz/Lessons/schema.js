import mongoose from "mongoose";

const schema = new mongoose.Schema(
    {
        _id: String,
        name: { type: String, required: true },
        description: String,
        module: { type: String, ref: "ModuleModel", required: true },
        course: { type: String, ref: "CourseModel", required: true },
        
        // Video information
        videoPath: String,
        videoFileName: String,
        
        // Quiz generation
        quizId: { type: String, ref: "QuizModel" },
        quizGenerationStatus: {
            type: String,
            enum: ["none", "pending", "processing", "completed", "error"],
            default: "none"
        },
        quizGenerationError: String,
        progress: { type: Number, default: 0 },
        progressMessage: { type: String, default: "" },
        numQuestions: { type: Number, default: 10 },
        difficulty: { type: String, default: "medium" },
        
        // Timestamps
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now }
    },
    { collection: "lessons" }
);

export default schema;
