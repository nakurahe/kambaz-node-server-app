import * as modulesDao from "./dao.js";

export default function ModuleRoutes(app) {
    // app.get("/modules/:courseId", async (req, res) => {
    //     const { courseId } = req.params;
    //     const modules = await modulesDao.findModulesForCourse(courseId);
    //     res.json(modules);
    // });

    // app.post("/modules", async (req, res) => {
    //     const newModule = await modulesDao.createModule(req.body);
    //     res.json(newModule);
    // });

    app.delete("/api/modules/:moduleId", async (req, res) => {
        const { moduleId } = req.params;
        const status = await modulesDao.deleteModule(moduleId);
        res.send(status);
    });

    app.put("/api/modules/:moduleId", async (req, res) => {
        const { moduleId } = req.params;
        const moduleUpdates = req.body;
        const status = await modulesDao.updateModule(moduleId, moduleUpdates);
        if (!status) {
            res.status(404).json({ error: "Module not found" });
            return;
        }
        res.json(status);
    });
}