import * as quizzesDao from './dao.js';

export default function QuizRoutes(app) {
    // Get all quizzes for a course
    app.get('/api/courses/:courseId/quizzes', async (req, res) => {
        const { courseId } = req.params;
        const quizzes = await quizzesDao.findQuizzesForCourse(courseId);
        res.json(quizzes);
    });

    // Get all quizzes
    app.get('/api/quizzes', async (req, res) => {
        const quizzes = await quizzesDao.findAllQuizzes();
        res.json(quizzes);
    });

    // Get quiz by ID
    app.get('/api/quizzes/:quizId', async (req, res) => {
        const { quizId } = req.params;
        const quiz = await quizzesDao.findQuizById(quizId);
        if (!quiz) {
            res.status(404).json({ error: 'Quiz not found' });
            return;
        }
        res.json(quiz);
    });

    // Create new quiz for a course
    app.post('/api/courses/:courseId/quizzes', async (req, res) => {
        const { courseId } = req.params;
        const quizData = { ...req.body, course: courseId };
        const newQuiz = await quizzesDao.createQuiz(quizData);
        res.json(newQuiz);
    });

    // Delete quiz
    app.delete('/api/quizzes/:quizId', async (req, res) => {
        const { quizId } = req.params;
        const status = await quizzesDao.deleteQuiz(quizId);
        res.send(status);
    });

    // Update quiz
    app.put('/api/quizzes/:quizId', async (req, res) => {
        const { quizId } = req.params;
        const quizUpdates = req.body;
        const status = await quizzesDao.updateQuiz(quizId, quizUpdates);
        res.send(status);
    });
}
