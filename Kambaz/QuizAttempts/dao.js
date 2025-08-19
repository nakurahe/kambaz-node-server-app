import model from "./model.js";

// Submit quiz attempt
export const submitQuizAttempt = async (attemptData) => {
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

// Get user's attempts for a quiz
export const findAttemptsByUserAndQuiz = async (userId, quizId) => {
    return await model.find({ user: userId, quiz: quizId }).sort({ submittedAt: -1 });
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
