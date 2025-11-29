import mongoose from "mongoose";

const videoQuizJobSchema = new mongoose.Schema(
    {
        _id: String,
        course: { type: String, ref: "CourseModel", required: true },
        createdBy: { type: String, ref: "UserModel", required: true },
        status: { 
            type: String, 
            enum: ["pending", "processing", "completed", "error"], 
            default: "pending" 
        },
        videoFileName: { type: String, required: true },
        videoPath: { type: String, required: true },
        outputDir: String,
        
        // Processing options
        numQuestions: { type: Number, default: 10 },
        difficulty: { 
            type: String, 
            enum: ["easy", "medium", "hard", "mixed"], 
            default: "medium" 
        },
        
        // Results
        generatedQuizId: { type: String, ref: "QuizModel" },
        slidesJson: String,
        transcriptJson: String,
        quizJson: String,
        
        // Progress tracking
        progress: { type: Number, default: 0 },
        progressMessage: { type: String, default: "Waiting to start..." },
        
        // Error handling
        errorMessage: String,
        
        // Timestamps
        startedAt: Date,
        completedAt: Date
    },
    { 
        collection: "videoquizjobs",
        timestamps: true 
    }
);

export default videoQuizJobSchema;
