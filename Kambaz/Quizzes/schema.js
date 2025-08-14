import mongoose from "mongoose";

const quizzesSchema = new mongoose.Schema(
    {
        _id: String,
        title: { type: String, required: true },
        course: { type: String, ref: "CourseModel", required: true },
        description: String,
        quizType: { type: String, enum: ["Graded Quiz", "Practice Quiz", "Graded Survey", "Ungraded Survey"], required: true, default: "Graded Quiz" },
        points: { type: Number },
        assignmentGroup: { type: String, enum: ["Quizzes", "Exams", "Assignments", "Project"], default: "Quizzes" },
        shuffleAnswers: { type: Boolean, default: true },
        timeLimit: { type: Number, default: 20 }, // default time limit in minutes
        multipleAttempts: { type: Boolean, default: false },
        howManyAttempts: { type: Number, default: 1 },
        showCorrectAnswers: { type: Boolean, default: false },
        accessCode: { type: String, default: "" },
        oneQuestionAtATime: { type: Boolean, default: true },
        webcamRequired: { type: Boolean, default: false },
        lockQuestionsAfterAnswering: { type: Boolean, default: false },
        dueDate: Date,
        availableFrom: Date,
        availableUntil: Date,
    },
    { collection: "quizzes" }
);

export default quizzesSchema;
