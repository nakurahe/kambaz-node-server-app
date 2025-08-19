import mongoose from "mongoose";

const quizAttemptsSchema = new mongoose.Schema(
    {
        _id: String,
        user: { type: String, ref: "UserModel", required: true },
        quiz: { type: String, ref: "QuizModel", required: true },
        attemptNumber: { type: Number, default: 1 },
        answers: [{
            question: { type: String, ref: "QuestionModel", required: true },
            answer: [{ type: mongoose.Schema.Types.Mixed }], // Array to handle multiple answers
            isCorrect: { type: Boolean },
            pointsEarned: { type: Number, default: 0 }
        }],
        totalPoints: { type: Number, default: 0 },
        maxPoints: { type: Number, required: true },
        score: { type: Number, default: 0 }, // percentage
        submittedAt: { type: Date, default: Date.now },
        gradedAt: { type: Date },
        isGraded: { type: Boolean, default: false }
    },
    { collection: "quizAttempts" }
);

export default quizAttemptsSchema;
