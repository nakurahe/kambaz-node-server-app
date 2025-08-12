import * as dao from "./dao.js";
import * as courseDao from "../Courses/dao.js";
import * as enrollmentsDao from "../Enrollments/dao.js";

// Helper function to safely serialize objects for session storage
function toSessionSafe(obj) {
    if (!obj) return null;
    try {
        if (typeof obj.toObject === "function") {
            return JSON.parse(JSON.stringify(obj.toObject()));
        }
        return JSON.parse(JSON.stringify(obj));
    } catch (error) {
        console.error("Error serializing object for session:", error);
        return null;
    }
}

export default function UserRoutes(app) {
    const createUser = async (req, res) => {
        try {
            const newUser = await dao.createUser(req.body);
            res.json(newUser);
        } catch (error) {
            res.status(500).json({
                message: "Error creating user",
                error: error.message,
            });
        }
    };
    const deleteUser = async (req, res) => {
        try {
            const status = await dao.deleteUser(req.params.userId);
            res.json(status);
        } catch (error) {
            res.status(500).json({
                message: "Error deleting user",
                error: error.message,
            });
        }
    };
    const findAllUsers = async (req, res) => {
        try {
            const { role, name } = req.query;
            if (role) {
                const usersByRole = await dao.findUsersByRole(role);
                res.json(usersByRole);
                return;
            }
            if (name) {
                const usersByName = await dao.findUsersByPartialName(name);
                res.json(usersByName);
                return;
            }
            const users = await dao.findAllUsers();
            res.json(users);
        } catch (error) {
            res.status(500).json({
                message: "Error finding users",
                error: error.message,
            });
        }
    };
    const findUserById = async (req, res) => {
        try {
            const user = await dao.findUserById(req.params.userId);
            if (user) {
                res.json(user);
            } else {
                res.status(404).json({ message: "User not found" });
            }
        } catch (error) {
            res.status(500).json({
                message: "Error finding user",
                error: error.message,
            });
        }
    };

    const updateUser = async (req, res) => {
        const userId = req.params.userId;
        const userUpdates = req.body;
        const currentUser = req.session["currentUser"];

        // Check if user is authenticated
        if (!currentUser) {
            res.status(401).json({ message: "Unauthorized - please sign in" });
            return;
        }

        // Allow ADMIN users to edit any user, or users to edit themselves
        const canEdit =
            currentUser.role === "ADMIN" || currentUser._id === userId;

        if (!canEdit) {
            res.status(403).json({
                message: "Forbidden - insufficient permissions",
            });
            return;
        }

        try {
            const updatedUser = await dao.updateUser(userId, userUpdates);

            // If user updated themselves, update session
            if (currentUser._id === userId) {
                req.session["currentUser"] = { ...currentUser, ...userUpdates };
            }

            res.json(updatedUser);
        } catch (error) {
            res.status(500).json({
                message: "Error updating user",
                error: error.message,
            });
        }
    };
    
    const signup = async (req, res) => {
        const user = await dao.findUserByUsername(req.body.username);
        if (user) {
            res.status(400).json({ message: "Username already in use" });
            return;
        }
        const currentUser = await dao.createUser(req.body);
        if (currentUser) {
            req.session["currentUser"] = toSessionSafe(currentUser);
            res.json(currentUser);
        } else {
            res.status(500).json({ message: "Failed to create user" });
        }
    };
    const signin = async (req, res) => {
        const { username, password } = req.body;
        const currentUser = await dao.findUserByCredentials(username, password);
        if (currentUser) {
            req.session["currentUser"] = toSessionSafe(currentUser);
            res.json(currentUser);
        } else {
            res.status(401).json({
                message: "Unable to login. Try again later.",
            });
        }
    };
    const signout = (req, res) => {
        req.session.destroy();
        res.sendStatus(200);
    };
    const profile = (req, res) => {
        const currentUser = req.session["currentUser"];
        if (!currentUser) {
            res.sendStatus(401);
            return;
        }
        res.json(currentUser);
    };
    const findCoursesForEnrolledUser = async (req, res) => {
        let { userId } = req.params;
        if (userId === "current") {
            const currentUser = req.session["currentUser"];
            if (!currentUser) {
                res.sendStatus(401);
                return;
            }
            userId = currentUser._id;
        }
        const courses = await courseDao.findCoursesForEnrolledUser(userId);
        res.json(courses);
    };
    app.get("/api/users/:userId/courses", findCoursesForEnrolledUser);

    const createCourse = async (req, res) => {
        const currentUser = req.session["currentUser"];
        const newCourse = await courseDao.createCourse(req.body);
        await enrollmentsDao.enrollUserInCourse(currentUser._id, newCourse._id);
        res.json(newCourse);
    };
    app.post("/api/users/current/courses", createCourse);

    app.post("/api/users", createUser);
    app.get("/api/users", findAllUsers);
    app.get("/api/users/:userId", findUserById);
    app.put("/api/users/:userId", updateUser);
    app.delete("/api/users/:userId", deleteUser);
    app.post("/api/users/signup", signup);
    app.post("/api/users/signin", signin);
    app.post("/api/users/signout", signout);
    app.post("/api/users/profile", profile);
}
