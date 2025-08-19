import model from "./model.js";
import { v4 as uuidv4 } from "uuid";

// Submit quiz attempt
export const submitQuizAttempt = async (attemptData) => {
    // Ensure unique ID generation
    if (!attemptData._id) {
        attemptData._id = uuidv4();
    }
    return await model.create(attemptData);
};

// Grade a quiz attempt
export const gradeQuizAttempt = async (attemptId, gradingData) => {
    return await model.findByIdAndUpdate(
        attemptId,
        {
            ...gradingData,
            gradedAt: new Date(),
            isGraded: true
        },
        { new: true }
    );
};

// Get user's attempts for a quiz (ensures individual user records)
export const findAttemptsByUserAndQuiz = async (userId, quizId) => {
    return await model.find({ user: userId, quiz: quizId }).sort({ submittedAt: -1 });
};

// Get the latest attempt for a specific user and quiz
export const findLatestAttemptByUserAndQuiz = async (userId, quizId) => {
    return await model.findOne({ user: userId, quiz: quizId }).sort({ submittedAt: -1 });
};

// Get all attempts for a quiz (for instructors)
export const findAttemptsByQuiz = async (quizId) => {
    return await model.find({ quiz: quizId }).populate("user", "firstName lastName");
};

// Get attempt by ID
export const findAttemptById = async (attemptId) => {
    return await model.findById(attemptId)
        .populate("user", "firstName lastName")
        .populate("quiz", "title")
        .populate("answers.question", "title points");
};

// Get attempt count for a user and quiz (to track attempt numbers)
export const getAttemptCount = async (userId, quizId) => {
    return await model.countDocuments({ user: userId, quiz: quizId });
};

// Check if user has already taken a quiz (useful for quiz restrictions)
export const hasUserTakenQuiz = async (userId, quizId) => {
    const count = await model.countDocuments({ user: userId, quiz: quizId });
    return count > 0;
};
