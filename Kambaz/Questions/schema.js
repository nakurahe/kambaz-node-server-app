import mongoose from "mongoose";

const questionsSchema = new mongoose.Schema(
    {
        _id: String,
        quiz: { type: String, ref: "QuizModel", required: true },
        questionType: { 
            type: String, 
            enum: ["True/False", "MultipleChoice", "FillInBlank"], 
            required: true 
        },
        title: { type: String, required: true },
        questionDescription: { type: String },
        points: { type: Number, required: true, default: 1 },
        answers: [{ type: String }],
        correctAnswers: [{ type: mongoose.Schema.Types.Mixed }]
    },
    { collection: "questions" }
);

export default questionsSchema;
