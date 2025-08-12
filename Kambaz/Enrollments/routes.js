import * as enrollmentsDao from './dao.js';

export default function EnrollmentRoutes(app) {
    app.post('/api/enrollments', async (req, res) => {
        const { userId, courseId } = req.body;
        await enrollmentsDao.enrollUserInCourse(userId, courseId);
        res.sendStatus(204);
    });

    app.delete('/api/enrollments', async (req, res) => {
        const { userId, courseId } = req.body;
        await enrollmentsDao.unenrollUserFromCourse(userId, courseId);
        res.sendStatus(204);
    });

    app.get('/api/enrollments/:userId', async (req, res) => {
        const { userId } = req.params;
        const enrollments = await enrollmentsDao.findEnrollmentsForUser(userId);
        res.json(enrollments);
    });
}
