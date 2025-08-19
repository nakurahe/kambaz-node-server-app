import * as quizAttemptsDao from "./dao.js";
import * as questionsDao from "../Questions/dao.js";

export default function QuizAttemptRoutes(app) {
    
    // Submit quiz attempt
    app.post("/api/quiz-attempts", async (req, res) => {
        try {
            const { userId, quizId, answers } = req.body;
            
            // Get the current attempt count for this user and quiz
            const attemptCount = await quizAttemptsDao.getAttemptCount(userId, quizId);
            
            // Create attempt data with proper individual user record
            const attemptData = {
                user: userId,
                quiz: quizId,
                attemptNumber: attemptCount + 1,
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
            
            // Auto-grade the attempt using standardized grading logic
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

    // Get latest attempt for a user and quiz
    app.get("/api/quiz-attempts/user/:userId/quiz/:quizId/latest", async (req, res) => {
        try {
            const { userId, quizId } = req.params;
            const attempt = await quizAttemptsDao.findLatestAttemptByUserAndQuiz(userId, quizId);
            res.json(attempt);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // Check if user has taken a quiz
    app.get("/api/quiz-attempts/user/:userId/quiz/:quizId/has-taken", async (req, res) => {
        try {
            const { userId, quizId } = req.params;
            const hasTaken = await quizAttemptsDao.hasUserTakenQuiz(userId, quizId);
            const attemptCount = await quizAttemptsDao.getAttemptCount(userId, quizId);
            res.json({ hasTaken, attemptCount });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
}

// Helper function to grade an attempt using standardized grading logic
async function gradeAttempt(attemptId) {
    try {
        const attempt = await quizAttemptsDao.findAttemptById(attemptId);
        if (!attempt) throw new Error("Attempt not found");
        
        let totalPoints = 0;
        let maxPoints = 0;
        
        // Grade each answer using the standardized grading logic
        for (let i = 0; i < attempt.answers.length; i++) {
            const answerData = attempt.answers[i];
            const question = await questionsDao.findQuestionById(answerData.question);
            
            if (question) {
                maxPoints += question.points;
                
                // Use the standardized checkAnswer function from Questions DAO
                // Convert array answers to single answer for the checkAnswer function
                const userAnswer = Array.isArray(answerData.answer) && answerData.answer.length === 1 
                    ? answerData.answer[0] 
                    : answerData.answer;
                    
                const isCorrect = questionsDao.checkAnswer(question, userAnswer);
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
