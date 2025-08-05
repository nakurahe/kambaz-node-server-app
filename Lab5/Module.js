const module = {
    id: 1,
    name: "NodeJS Module",
    description: "Create a NodeJS module with ExpressJS",
    course: "NodeJS Basics",
};

export default function Module(app) {
    app.get("/lab5/module", (req, res) => {
        res.json(module);
    });
    app.get("/lab5/module/name", (req, res) => {
        res.json({ name: module.name });
    });
}
