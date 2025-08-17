import * as questionsDao from './dao.js';

export default function QuestionRoutes(app) {
    // Get all questions for a quiz
    app.get('/api/quizzes/:quizId/questions', async (req, res) => {
        try {
            const { quizId } = req.params;
            const questions = await questionsDao.findQuestionsForQuiz(quizId);
            res.json(questions);
        } catch (error) {
            console.error('Error fetching questions for quiz:', error);
            res.status(500).json({ error: 'Failed to fetch questions' });
        }
    });

    // Get all questions
    app.get('/api/questions', async (req, res) => {
        try {
            const questions = await questionsDao.findAllQuestions();
            res.json(questions);
        } catch (error) {
            console.error('Error fetching all questions:', error);
            res.status(500).json({ error: 'Failed to fetch questions' });
        }
    });

    // Get question by ID
    app.get('/api/questions/:questionId', async (req, res) => {
        try {
            const { questionId } = req.params;
            const question = await questionsDao.findQuestionById(questionId);
            if (!question) {
                res.status(404).json({ error: 'Question not found' });
                return;
            }
            res.json(question);
        } catch (error) {
            console.error('Error fetching question:', error);
            res.status(500).json({ error: 'Failed to fetch question' });
        }
    });

    // Create new question for a quiz
    app.post('/api/quizzes/:quizId/questions', async (req, res) => {
        try {
            const { quizId } = req.params;
            const questionData = { ...req.body, quiz: quizId };
            
            // Validate required fields
            if (!questionData.title) {
                return res.status(400).json({ error: 'Question title is required' });
            }
            if (!questionData.questionType) {
                return res.status(400).json({ error: 'Question type is required' });
            }
            
            // Validate and set default answers based on question type
            if (questionData.questionType === "True/False") {
                questionData.answers = ["True", "False"];
            } else if (questionData.questionType === "FillInBlank") {
                // For fill-in-blank, we can set empty strings or let frontend handle
                questionData.answers = questionData.answers || [""];
            }
            // For MultipleChoice, answers should be provided by the frontend
            
            const newQuestion = await questionsDao.createQuestion(questionData);
            res.json(newQuestion);
        } catch (error) {
            console.error('Error creating question:', error);
            res.status(500).json({ error: error.message || 'Failed to create question' });
        }
    });

    // Delete question
    app.delete('/api/questions/:questionId', async (req, res) => {
        try {
            const { questionId } = req.params;
            const status = await questionsDao.deleteQuestion(questionId);
            res.send(status);
        } catch (error) {
            console.error('Error deleting question:', error);
            res.status(500).json({ error: 'Failed to delete question' });
        }
    });

    // Update question
    app.put('/api/questions/:questionId', async (req, res) => {
        try {
            const { questionId } = req.params;
            const questionUpdates = req.body;
            
            // Validate and update answers based on question type if type is being changed
            if (questionUpdates.questionType === "True/False") {
                questionUpdates.answers = ["True", "False"];
            } else if (questionUpdates.questionType === "FillInBlank" && !questionUpdates.answers) {
                questionUpdates.answers = [""];
            }
            
            const status = await questionsDao.updateQuestion(questionId, questionUpdates);
            res.send(status);
        } catch (error) {
            console.error('Error updating question:', error);
            res.status(500).json({ error: error.message || 'Failed to update question' });
        }
    });

    // Delete all questions for a quiz (useful when deleting a quiz)
    app.delete('/api/quizzes/:quizId/questions', async (req, res) => {
        try {
            const { quizId } = req.params;
            const status = await questionsDao.deleteQuestionsForQuiz(quizId);
            res.send(status);
        } catch (error) {
            console.error('Error deleting questions for quiz:', error);
            res.status(500).json({ error: 'Failed to delete questions' });
        }
    });

    // Check a single answer
    app.post('/api/questions/:questionId/check', async (req, res) => {
        try {
            const { questionId } = req.params;
            const { userAnswer } = req.body;
            
            const question = await questionsDao.findQuestionById(questionId);
            if (!question) {
                res.status(404).json({ error: 'Question not found' });
                return;
            }

            const isCorrect = questionsDao.checkAnswer(question, userAnswer);
            res.json({ 
                isCorrect, 
                pointsEarned: isCorrect ? question.points : 0,
                pointsPossible: question.points
            });
        } catch (error) {
            console.error('Error checking answer:', error);
            res.status(500).json({ error: 'Failed to check answer' });
        }
    });

    // Grade all answers for a quiz
    app.post('/api/quizzes/:quizId/grade', async (req, res) => {
        try {
            const { quizId } = req.params;
            const { userAnswers } = req.body; // Object with questionId as key, answer as value
            
            const gradingResult = await questionsDao.gradeQuizAnswers(quizId, userAnswers);
            res.json(gradingResult);
        } catch (error) {
            console.error('Error grading quiz:', error);
            res.status(500).json({ error: 'Failed to grade quiz' });
        }
    });
}
