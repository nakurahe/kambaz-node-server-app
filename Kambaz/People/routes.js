import * as peopleDao from './dao.js';

export default function PeopleRoutes(app) {
    app.get('/api/people/:courseId', async (req, res) => {
        const { courseId } = req.params;
        const people = await peopleDao.findPeopleForCourse(courseId);
        res.json(people);
    });

    app.post('/api/people', async (req, res) => {
        const newPerson = await peopleDao.createPerson(req.body);
        res.json(newPerson);
    });

    app.delete('/api/people/:personId', async (req, res) => {
        const { personId } = req.params;
        await peopleDao.deletePerson(personId);
        res.sendStatus(204);
    });

    app.put('/api/people/:personId', async (req, res) => {
        const { personId } = req.params;
        const personUpdates = req.body;
        const updatedPerson = await peopleDao.updatePerson(personId, personUpdates);
        if (!updatedPerson) {
            res.status(404).json({ error: 'Person not found' });
            return;
        }
        res.json(updatedPerson);
    });
}