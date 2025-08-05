import * as assignmentsDao from './dao.js';

export default function AssignmentRoutes(app) {
    // app.get('/api/assignments/:courseId', async (req, res) => {
    //     const { courseId } = req.params;
    //     const assignments = await assignmentsDao.findAssignmentsForCourse(courseId);
    //     res.json(assignments);
    // });

    app.post('/api/assignments', async (req, res) => {
        const newAssignment = await assignmentsDao.createAssignment(req.body);
        res.json(newAssignment);
    });

    app.delete('/api/assignments/:assignmentId', async (req, res) => {
        const { assignmentId } = req.params;
        await assignmentsDao.deleteAssignment(assignmentId);
        res.sendStatus(204);
    });

    app.put('/api/assignments/:assignmentId', async (req, res) => {
        const { assignmentId } = req.params;
        const assignmentUpdates = req.body;
        const updatedAssignment = await assignmentsDao.updateAssignment(assignmentId, assignmentUpdates);
        if (!updatedAssignment) {
            res.status(404).json({ error: 'Assignment not found' });
            return;
        }
        res.json(updatedAssignment);
    });
}