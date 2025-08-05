const assignment = {
    id: 1,
    title: "NodeJS Assignment",
    description: "Create a NodeJS server with ExpressJS",
    due: "2021-10-10",
    completed: false,
    score: 0,
};

const module = {
    id: 1,
    name: "NodeJS Module",
    description: "Create a NodeJS module with ExpressJS",
    course: "NodeJS Basics",
};

export default function WorkingWithObjects(app) {
    app.get("/lab5/assignment", (req, res) => {
        res.json(assignment);
    });
    app.get("/lab5/module", (req, res) => {
        res.json(module);
    });

    app.get("/lab5/assignment/title", (req, res) => {
        res.json({ title: assignment.title });
    });
    app.get("/lab5/module/name", (req, res) => {
        res.json({ name: module.name });
    });

    app.get("/lab5/assignment/title/:newTitle", (req, res) => {
        const { newTitle } = req.params;
        assignment.title = newTitle;
        res.json(assignment);
    });
    app.get("/lab5/module/name/:newName", (req, res) => {
        const { newName } = req.params;
        module.name = newName;
        res.json(module);
    });

    app.get("/lab5/assignment/score/:score", (req, res) => {
        const { score } = req.params;
        assignment.score = parseInt(score, 10);
        res.json(assignment);
    });
    app.get("/lab5/assignment/completed/:status", (req, res) => {
        const { status } = req.params;
        assignment.completed = status === "true";
        res.json(assignment);
    });

    app.get("/lab5/module/description/:newDescription", (req, res) => {
        const { newDescription } = req.params;
        module.description = newDescription;
        res.json(module);
    });
}
