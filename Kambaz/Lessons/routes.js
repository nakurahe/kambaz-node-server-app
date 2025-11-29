/**
 * Lessons Routes
 * Handles CRUD for lessons with video upload and optional quiz generation
 */

import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import * as lessonDao from "./dao.js";
import * as quizzesDao from "../Quizzes/dao.js";
import * as questionsDao from "../Questions/dao.js";
import { processLessonVideo } from "./processor.js";

const router = express.Router();

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for video uploads
const PROJECT_ROOT = path.resolve(__dirname, "../..");
const UPLOAD_DIR = process.env.UPLOAD_DIR 
    ? path.resolve(PROJECT_ROOT, process.env.UPLOAD_DIR)
    : path.resolve(PROJECT_ROOT, "uploads/videos");

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `lesson-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 500 * 1024 * 1024 }, // 500MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /mp4|avi|mov|mkv|webm/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = file.mimetype.startsWith('video/');
        if (extname && mimetype) {
            cb(null, true);
        } else {
            cb(new Error('Only video files are allowed'));
        }
    }
});

// GET /api/modules/:mid/lessons - Get all lessons for a module
router.get("/modules/:mid/lessons", async (req, res) => {
    try {
        const { mid } = req.params;
        const lessons = await lessonDao.findLessonsForModule(mid);
        res.json(lessons);
    } catch (error) {
        console.error("Error fetching lessons:", error);
        res.status(500).json({ error: "Failed to fetch lessons" });
    }
});

// GET /api/courses/:cid/lessons - Get all lessons for a course
router.get("/courses/:cid/lessons", async (req, res) => {
    try {
        const { cid } = req.params;
        const lessons = await lessonDao.findLessonsForCourse(cid);
        res.json(lessons);
    } catch (error) {
        console.error("Error fetching lessons:", error);
        res.status(500).json({ error: "Failed to fetch lessons" });
    }
});

// GET /api/lessons/:lid - Get a single lesson
router.get("/lessons/:lid", async (req, res) => {
    try {
        const { lid } = req.params;
        const lesson = await lessonDao.findLessonById(lid);
        if (!lesson) {
            return res.status(404).json({ error: "Lesson not found" });
        }
        res.json(lesson);
    } catch (error) {
        console.error("Error fetching lesson:", error);
        res.status(500).json({ error: "Failed to fetch lesson" });
    }
});

// POST /api/modules/:mid/lessons - Create a new lesson with optional video upload
router.post("/modules/:mid/lessons", upload.single("video"), async (req, res) => {
    try {
        const { mid } = req.params;
        const { name, description, course, generateQuiz, numQuestions, difficulty } = req.body;
        
        // Create lesson data
        const lessonData = {
            name,
            description: description || "",
            module: mid,
            course,
            quizGenerationStatus: "none"
        };
        
        // Handle video upload
        if (req.file) {
            lessonData.videoPath = req.file.path;
            lessonData.videoFileName = req.file.originalname;
        }
        
        // If quiz generation is requested
        if (generateQuiz === "true" && req.file) {
            lessonData.quizGenerationStatus = "pending";
        }
        
        // Create the lesson
        const lesson = await lessonDao.createLesson(lessonData);
        
        // Start quiz generation in background if requested
        if (generateQuiz === "true" && req.file) {
            // Don't await - run in background
            processLessonVideo(lesson._id, {
                numQuestions: parseInt(numQuestions) || 10,
                difficulty: difficulty || "medium"
            }).catch(err => {
                console.error(`Quiz generation failed for lesson ${lesson._id}:`, err);
            });
        }
        
        res.status(201).json(lesson);
    } catch (error) {
        console.error("Error creating lesson:", error);
        res.status(500).json({ error: "Failed to create lesson" });
    }
});

// PUT /api/lessons/:lid - Update a lesson
router.put("/lessons/:lid", upload.single("video"), async (req, res) => {
    try {
        const { lid } = req.params;
        const { name, description, generateQuiz, numQuestions, difficulty } = req.body;
        
        const existingLesson = await lessonDao.findLessonById(lid);
        if (!existingLesson) {
            return res.status(404).json({ error: "Lesson not found" });
        }
        
        const updates = {
            name: name || existingLesson.name,
            description: description !== undefined ? description : existingLesson.description
        };
        
        // Handle new video upload
        if (req.file) {
            // Delete old video file if exists
            if (existingLesson.videoPath && fs.existsSync(existingLesson.videoPath)) {
                fs.unlinkSync(existingLesson.videoPath);
            }
            updates.videoPath = req.file.path;
            updates.videoFileName = req.file.originalname;
            
            // Reset quiz if new video uploaded
            if (existingLesson.quizId) {
                updates.quizId = null;
                updates.quizGenerationStatus = "none";
            }
        }
        
        // If quiz generation is requested for new video
        if (generateQuiz === "true" && req.file) {
            updates.quizGenerationStatus = "pending";
        }
        
        await lessonDao.updateLesson(lid, updates);
        const updatedLesson = await lessonDao.findLessonById(lid);
        
        // Start quiz generation in background if requested
        if (generateQuiz === "true" && req.file) {
            processLessonVideo(lid, {
                numQuestions: parseInt(numQuestions) || 10,
                difficulty: difficulty || "medium"
            }).catch(err => {
                console.error(`Quiz generation failed for lesson ${lid}:`, err);
            });
        }
        
        res.json(updatedLesson);
    } catch (error) {
        console.error("Error updating lesson:", error);
        res.status(500).json({ error: "Failed to update lesson" });
    }
});

// DELETE /api/lessons/:lid - Delete a lesson
router.delete("/lessons/:lid", async (req, res) => {
    try {
        const { lid } = req.params;
        
        const lesson = await lessonDao.findLessonById(lid);
        if (!lesson) {
            return res.status(404).json({ error: "Lesson not found" });
        }
        
        // Delete video file if exists
        if (lesson.videoPath && fs.existsSync(lesson.videoPath)) {
            fs.unlinkSync(lesson.videoPath);
        }
        
        // Optionally delete associated quiz and questions
        if (lesson.quizId) {
            await questionsDao.deleteQuestionsForQuiz(lesson.quizId);
            await quizzesDao.deleteQuiz(lesson.quizId);
        }
        
        await lessonDao.deleteLesson(lid);
        res.json({ message: "Lesson deleted successfully" });
    } catch (error) {
        console.error("Error deleting lesson:", error);
        res.status(500).json({ error: "Failed to delete lesson" });
    }
});

// POST /api/lessons/:lid/generate-quiz - Trigger quiz generation for existing lesson
router.post("/lessons/:lid/generate-quiz", async (req, res) => {
    try {
        const { lid } = req.params;
        const { numQuestions, difficulty } = req.body;
        
        const lesson = await lessonDao.findLessonById(lid);
        if (!lesson) {
            return res.status(404).json({ error: "Lesson not found" });
        }
        
        if (!lesson.videoPath) {
            return res.status(400).json({ error: "Lesson has no video" });
        }
        
        if (lesson.quizGenerationStatus === "processing") {
            return res.status(400).json({ error: "Quiz generation already in progress" });
        }
        
        // Update status to pending
        await lessonDao.updateQuizGenerationStatus(lid, "pending");
        
        // Start quiz generation in background
        processLessonVideo(lid, {
            numQuestions: numQuestions || 10,
            difficulty: difficulty || "medium"
        }).catch(err => {
            console.error(`Quiz generation failed for lesson ${lid}:`, err);
        });
        
        const updatedLesson = await lessonDao.findLessonById(lid);
        res.json(updatedLesson);
    } catch (error) {
        console.error("Error triggering quiz generation:", error);
        res.status(500).json({ error: "Failed to trigger quiz generation" });
    }
});

// GET /api/lessons/:lid/video - Stream video file
router.get("/lessons/:lid/video", async (req, res) => {
    try {
        const { lid } = req.params;
        const lesson = await lessonDao.findLessonById(lid);
        
        if (!lesson || !lesson.videoPath) {
            return res.status(404).json({ error: "Video not found" });
        }
        
        if (!fs.existsSync(lesson.videoPath)) {
            return res.status(404).json({ error: "Video file not found" });
        }
        
        const stat = fs.statSync(lesson.videoPath);
        const fileSize = stat.size;
        const range = req.headers.range;
        
        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunksize = (end - start) + 1;
            const file = fs.createReadStream(lesson.videoPath, { start, end });
            const head = {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': 'video/mp4',
            };
            res.writeHead(206, head);
            file.pipe(res);
        } else {
            const head = {
                'Content-Length': fileSize,
                'Content-Type': 'video/mp4',
            };
            res.writeHead(200, head);
            fs.createReadStream(lesson.videoPath).pipe(res);
        }
    } catch (error) {
        console.error("Error streaming video:", error);
        res.status(500).json({ error: "Failed to stream video" });
    }
});

export default function LessonRoutes(app) {
    app.use("/api", router);
}
