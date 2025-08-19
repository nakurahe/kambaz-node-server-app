import * as quizAttemptsDao from "./dao.js";
import * as questionsDao from "../Questions/dao.js";

export default function QuizAttemptRoutes(app) {
    
    // Submit quiz attempt
    app.post("/api/quiz-attempts", async (req, res) => {
        try {
            const { userId, quizId, answers } = req.body;
            
            // Create attempt data
            const attemptData = {
                _id: new Date().getTime().toString(),
                user: userId,
                quiz: quizId,
                answers: answers.map(answer => ({
                    question: answer.questionId,
                    answer: answer.answer,
                    isCorrect: false, // Will be determined during grading
                    pointsEarned: 0
                })),
                totalPoints: 0,
                maxPoints: 0, // Will be calculated during grading
                score: 0
            };
            
            const attempt = await quizAttemptsDao.submitQuizAttempt(attemptData);
            
            // Auto-grade the attempt
            await gradeAttempt(attempt._id);
            
            // Return the graded attempt
            const gradedAttempt = await quizAttemptsDao.findAttemptById(attempt._id);
            res.json(gradedAttempt);
            
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
    
    // Get user's attempts for a quiz
    app.get("/api/quiz-attempts/user/:userId/quiz/:quizId", async (req, res) => {
        try {
            const { userId, quizId } = req.params;
            const attempts = await quizAttemptsDao.findAttemptsByUserAndQuiz(userId, quizId);
            res.json(attempts);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
    
    // Get attempt details by ID
    app.get("/api/quiz-attempts/:attemptId", async (req, res) => {
        try {
            const { attemptId } = req.params;
            const attempt = await quizAttemptsDao.findAttemptById(attemptId);
            res.json(attempt);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
    
    // Get all attempts for a quiz (for instructors)
    app.get("/api/quiz-attempts/quiz/:quizId", async (req, res) => {
        try {
            const { quizId } = req.params;
            const attempts = await quizAttemptsDao.findAttemptsByQuiz(quizId);
            res.json(attempts);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
}

// Helper function to grade an attempt
async function gradeAttempt(attemptId) {
    try {
        const attempt = await quizAttemptsDao.findAttemptById(attemptId);
        if (!attempt) throw new Error("Attempt not found");
        
        let totalPoints = 0;
        let maxPoints = 0;
        
        // Grade each answer
        for (let i = 0; i < attempt.answers.length; i++) {
            const answerData = attempt.answers[i];
            const question = await questionsDao.findQuestionById(answerData.question);
            
            if (question) {
                maxPoints += question.points;
                
                // Simple grading logic - compare answers
                const isCorrect = compareAnswers(answerData.answer, question.correctAnswers);
                const pointsEarned = isCorrect ? question.points : 0;
                
                attempt.answers[i].isCorrect = isCorrect;
                attempt.answers[i].pointsEarned = pointsEarned;
                totalPoints += pointsEarned;
            }
        }
        
        const score = maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : 0;
        
        // Update the attempt with grading results
        await quizAttemptsDao.gradeQuizAttempt(attemptId, {
            answers: attempt.answers,
            totalPoints,
            maxPoints,
            score
        });
        
    } catch (error) {
        console.error("Error grading attempt:", error);
    }
}

// Helper function to compare answers
function compareAnswers(userAnswers, correctAnswers) {
    if (!userAnswers || !correctAnswers) return false;
    
    // Convert to arrays if not already
    const userArray = Array.isArray(userAnswers) ? userAnswers : [userAnswers];
    const correctArray = Array.isArray(correctAnswers) ? correctAnswers : [correctAnswers];
    
    // Simple comparison - you can make this more sophisticated
    if (userArray.length !== correctArray.length) return false;
    
    // Sort both arrays and compare
    const sortedUser = userArray.map(a => String(a).toLowerCase().trim()).sort();
    const sortedCorrect = correctArray.map(a => String(a).toLowerCase().trim()).sort();
    
    return sortedUser.every((answer, index) => answer === sortedCorrect[index]);
}
