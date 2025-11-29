import model from "./model.js";
import { v4 as uuidv4 } from "uuid";

export function findQuestionsForQuiz(quizId) {
    return model.find({ quiz: quizId });
}

export function findAllQuestions() {
    return model.find();
}

export function findQuestionById(questionId) {
    return model.findById(questionId);
}

export function createQuestion(question) {
    const newQuestion = { ...question, _id: uuidv4() };
    return model.create(newQuestion);
}

export function deleteQuestion(questionId) {
    return model.deleteOne({ _id: questionId });
}

export function updateQuestion(questionId, questionUpdates) {
    return model.updateOne({ _id: questionId }, { $set: questionUpdates });
}

export function deleteQuestionsForQuiz(quizId) {
    return model.deleteMany({ quiz: quizId });
}

// Utility function to check if an answer is correct
export function checkAnswer(question, userAnswer) {
    if (!question.correctAnswers || question.correctAnswers.length === 0) {
        return false; // No correct answers defined (like surveys)
    }

    switch (question.questionType) {
        case "True/False":
            // Handle both string and boolean values
            const normalizedUserAnswer = String(userAnswer).toLowerCase();
            return question.correctAnswers.some(correctAnswer => 
                String(correctAnswer).toLowerCase() === normalizedUserAnswer
            );
        
        case "MultipleChoice":
            // correctAnswers stores indices (e.g., [0], [1], [2])
            // userAnswer is also index-based (e.g., [0] or 0)
            if (Array.isArray(userAnswer)) {
                if (userAnswer.length === 0) return false;
                // Convert to numbers and compare
                const userIndices = userAnswer.map(a => Number(a));
                return userIndices.every(idx => question.correctAnswers.includes(idx)) &&
                       userIndices.length === question.correctAnswers.length;
            } else {
                // Single selection - check if index matches
                return question.correctAnswers.includes(Number(userAnswer));
            }
        
        case "FillInBlank":
            // Case-insensitive comparison for fill-in-blank
            const normalizedAnswer = String(userAnswer).toLowerCase().trim();
            return question.correctAnswers.some(correctAnswer => 
                String(correctAnswer).toLowerCase().trim() === normalizedAnswer
            );
        
        default:
            return false;
    }
}

// Function to grade a user's answers for a quiz
export async function gradeQuizAnswers(quizId, userAnswers) {
    const questions = await findQuestionsForQuiz(quizId);
    let totalPoints = 0;
    let earnedPoints = 0;
    const results = [];

    for (const question of questions) {
        totalPoints += question.points;
        const userAnswer = userAnswers[question._id];
        const isCorrect = checkAnswer(question, userAnswer);
        
        if (isCorrect) {
            earnedPoints += question.points;
        }

        results.push({
            questionId: question._id,
            userAnswer,
            isCorrect,
            pointsEarned: isCorrect ? question.points : 0,
            pointsPossible: question.points
        });
    }

    return {
        totalPoints,
        earnedPoints,
        percentage: totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0,
        results
    };
}
