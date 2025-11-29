// Load environment variables FIRST before any other imports
import "dotenv/config";

import express from "express";
import Hello from "./Hello.js";
import Lab5 from "./Lab5/index.js";
import cors from "cors";
import UserRoutes from "./Kambaz/Users/routes.js";
import session from "express-session";
import CourseRoutes from "./Kambaz/Courses/routes.js";
import ModuleRoutes from "./Kambaz/Modules/routes.js";
import AssignmentRoutes from "./Kambaz/Assignments/routes.js";
import QuizRoutes from "./Kambaz/Quizzes/routes.js";
import QuestionRoutes from "./Kambaz/Questions/routes.js";
import QuizAttemptRoutes from "./Kambaz/QuizAttempts/routes.js";
import EnrollmentRoutes from "./Kambaz/Enrollments/routes.js";
import PeopleRoutes from "./Kambaz/People/routes.js";
import VideoQuizRoutes from "./Kambaz/VideoQuiz/routes.js";
import LessonRoutes from "./Kambaz/Lessons/routes.js";
import mongoose from "mongoose";

const CONNECTION_STRING = process.env.MONGODB_CONNECTION_STRING || "mongodb://localhost:27017/kambaz";
mongoose.connect(CONNECTION_STRING);

const app = express();
app.use(
    cors({
        credentials: true,
        origin: process.env.NETLIFY_URL || "http://localhost:5173",
    })
);
const sessionOptions = {
    secret: process.env.SESSION_SECRET || "kambaz",
    resave: false,
    saveUninitialized: false,
};
if (process.env.NODE_ENV !== "development") { // Production settings
    sessionOptions.proxy = true;
    sessionOptions.cookie = {
        sameSite: "none",
        secure: true,
        domain: process.env.NODE_SERVER_DOMAIN,
    };
}
app.use(session(sessionOptions));

// Debug middleware to catch session serialization issues
app.use((req, res, next) => {
    const originalEnd = res.end;
    res.end = function(...args) {
        try {
            return originalEnd.apply(this, args);
        } catch (error) {
            if (error.message.includes('Converting circular structure to JSON')) {
                console.error('Session serialization error. Session contents:', Object.keys(req.session || {}));
                console.error('Current user type:', typeof req.session?.currentUser);
                console.error('Error:', error.message);
                // Clear problematic session data
                if (req.session) {
                    req.session.currentUser = null;
                }
            }
            throw error;
        }
    };
    next();
});

app.use(express.json());

Lab5(app);
UserRoutes(app);
Hello(app);
CourseRoutes(app);
ModuleRoutes(app);
AssignmentRoutes(app);
QuizRoutes(app);
QuestionRoutes(app);
QuizAttemptRoutes(app);
EnrollmentRoutes(app);
PeopleRoutes(app);
VideoQuizRoutes(app);
LessonRoutes(app);

app.listen(process.env.PORT || 4000);
