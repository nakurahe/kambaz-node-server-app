import * as assignmentsDao from './dao.js';

export default function AssignmentRoutes(app) {
    // Get all assignments for a course
    app.get('/api/courses/:courseId/assignments', async (req, res) => {
        const { courseId } = req.params;
        const assignments = await assignmentsDao.findAssignmentsForCourse(courseId);
        res.json(assignments);
    });

    // Get all assignments
    app.get('/api/assignments', async (req, res) => {
        const assignments = await assignmentsDao.findAllAssignments();
        res.json(assignments);
    });

    // Get assignment by ID
    app.get('/api/assignments/:assignmentId', async (req, res) => {
        const { assignmentId } = req.params;
        const assignment = await assignmentsDao.findAssignmentById(assignmentId);
        if (!assignment) {
            res.status(404).json({ error: 'Assignment not found' });
            return;
        }
        res.json(assignment);
    });

    // Create new assignment
    app.post('/api/courses/:courseId/assignments', async (req, res) => {
        const { courseId } = req.params;
        const assignmentData = { ...req.body, course: courseId };
        const newAssignment = await assignmentsDao.createAssignment(assignmentData);
        res.json(newAssignment);
    });

    // // Create assignment (alternative route)
    // app.post('/api/assignments', async (req, res) => {
    //     const newAssignment = await assignmentsDao.createAssignment(req.body);
    //     res.json(newAssignment);
    // });

    // Delete assignment
    app.delete('/api/assignments/:assignmentId', async (req, res) => {
        const { assignmentId } = req.params;
        const status = await assignmentsDao.deleteAssignment(assignmentId);
        res.send(status);
    });

    // Update assignment
    app.put('/api/assignments/:assignmentId', async (req, res) => {
        const { assignmentId } = req.params;
        const assignmentUpdates = req.body;
        const status = await assignmentsDao.updateAssignment(assignmentId, assignmentUpdates);
        res.send(status);
    });
}
