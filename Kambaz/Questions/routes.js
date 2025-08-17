import * as questionsDao from './dao.js';

export default function QuestionRoutes(app) {
    // Get all questions for a quiz
    app.get('/api/quizzes/:quizId/questions', async (req, res) => {
        const { quizId } = req.params;
        const questions = await questionsDao.findQuestionsForQuiz(quizId);
        res.json(questions);
    });

    // Get all questions
    app.get('/api/questions', async (req, res) => {
        const questions = await questionsDao.findAllQuestions();
        res.json(questions);
    });

    // Get question by ID
    app.get('/api/questions/:questionId', async (req, res) => {
        const { questionId } = req.params;
        const question = await questionsDao.findQuestionById(questionId);
        if (!question) {
            res.status(404).json({ error: 'Question not found' });
            return;
        }
        res.json(question);
    });

    // Create new question for a quiz
    app.post('/api/quizzes/:quizId/questions', async (req, res) => {
        const { quizId } = req.params;
        const questionData = { ...req.body, quiz: quizId };
        
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
    });

    // Delete question
    app.delete('/api/questions/:questionId', async (req, res) => {
        const { questionId } = req.params;
        const status = await questionsDao.deleteQuestion(questionId);
        res.send(status);
    });

    // Update question
    app.put('/api/questions/:questionId', async (req, res) => {
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
    });

    // Delete all questions for a quiz (useful when deleting a quiz)
    app.delete('/api/quizzes/:quizId/questions', async (req, res) => {
        const { quizId } = req.params;
        const status = await questionsDao.deleteQuestionsForQuiz(quizId);
        res.send(status);
    });

    // Check a single answer
    app.post('/api/questions/:questionId/check', async (req, res) => {
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
    });

    // Grade all answers for a quiz
    app.post('/api/quizzes/:quizId/grade', async (req, res) => {
        const { quizId } = req.params;
        const { userAnswers } = req.body; // Object with questionId as key, answer as value
        
        const gradingResult = await questionsDao.gradeQuizAnswers(quizId, userAnswers);
        res.json(gradingResult);
    });
}
