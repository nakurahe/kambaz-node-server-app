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
            return question.correctAnswers.includes(userAnswer);
        
        case "MultipleChoice":
            // If correctAnswers contains indices
            if (typeof question.correctAnswers[0] === 'number') {
                return question.correctAnswers.includes(parseInt(userAnswer));
            }
            // If correctAnswers contains the actual answer text
            return question.correctAnswers.includes(userAnswer);
        
        case "FillInBlank":
            // Case-insensitive comparison for fill-in-blank
            const normalizedUserAnswer = userAnswer.toLowerCase().trim();
            return question.correctAnswers.some(correctAnswer => 
                correctAnswer.toLowerCase().trim() === normalizedUserAnswer
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
