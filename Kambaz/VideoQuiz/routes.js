/**
 * Video Quiz Routes
 * Handles video upload and quiz generation endpoints
 */

import multer from "multer";
import path from "path";
import fs from "fs";
import * as videoQuizDao from "./dao.js";
import { processVideo, isPipelineAvailable, getPipelineStatus } from "./processor.js";

// Configure multer for video uploads
const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads/videos";

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `video-${uniqueSuffix}${ext}`);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = [".mp4", ".avi", ".mov", ".mkv"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error("Invalid file type. Only MP4, AVI, MOV, MKV are allowed."), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 500 * 1024 * 1024 // 500MB max
    }
});

export default function VideoQuizRoutes(app) {
    
    // Check pipeline status
    app.get("/api/video-quiz/status", (req, res) => {
        res.json(getPipelineStatus());
    });
    
    // Get all jobs for a course
    app.get("/api/courses/:courseId/video-quiz/jobs", async (req, res) => {
        try {
            const { courseId } = req.params;
            const jobs = await videoQuizDao.findJobsForCourse(courseId);
            res.json(jobs);
        } catch (error) {
            console.error("Error fetching jobs:", error);
            res.status(500).json({ error: "Failed to fetch jobs" });
        }
    });
    
    // Get job by ID
    app.get("/api/video-quiz/jobs/:jobId", async (req, res) => {
        try {
            const { jobId } = req.params;
            const job = await videoQuizDao.findJobById(jobId);
            if (!job) {
                return res.status(404).json({ error: "Job not found" });
            }
            res.json(job);
        } catch (error) {
            console.error("Error fetching job:", error);
            res.status(500).json({ error: "Failed to fetch job" });
        }
    });
    
    // Upload video and start processing
    app.post("/api/courses/:courseId/video-quiz/upload", 
        upload.single("video"),
        async (req, res) => {
            try {
                const { courseId } = req.params;
                const { numQuestions, difficulty } = req.body;
                
                // Check if pipeline is available
                if (!isPipelineAvailable()) {
                    return res.status(503).json({ 
                        error: "Video processing pipeline not available" 
                    });
                }
                
                // Check if file was uploaded
                if (!req.file) {
                    return res.status(400).json({ error: "No video file uploaded" });
                }
                
                // Get current user from session
                const currentUser = req.session?.currentUser;
                if (!currentUser) {
                    return res.status(401).json({ error: "Not authenticated" });
                }
                
                // Create job record
                const jobData = {
                    course: courseId,
                    createdBy: currentUser._id,
                    videoFileName: req.file.originalname,
                    videoPath: req.file.path,
                    outputDir: path.join(
                        process.env.PIPELINE_DIR || "../smart-video-quiz-generator",
                        "output",
                        `job-${Date.now()}`
                    ),
                    numQuestions: parseInt(numQuestions) || 10,
                    difficulty: difficulty || "medium",
                    status: "pending",
                    progress: 0,
                    progressMessage: "Job created, waiting to start..."
                };
                
                const job = await videoQuizDao.createJob(jobData);
                
                // Start processing in background (don't await)
                processVideo(job._id).catch(err => {
                    console.error(`Background processing error for job ${job._id}:`, err);
                });
                
                res.status(201).json({
                    message: "Video uploaded successfully. Processing started.",
                    jobId: job._id,
                    job
                });
                
            } catch (error) {
                console.error("Error uploading video:", error);
                res.status(500).json({ error: error.message || "Failed to upload video" });
            }
        }
    );
    
    // Delete a job
    app.delete("/api/video-quiz/jobs/:jobId", async (req, res) => {
        try {
            const { jobId } = req.params;
            const job = await videoQuizDao.findJobById(jobId);
            
            if (!job) {
                return res.status(404).json({ error: "Job not found" });
            }
            
            // Delete uploaded video file if exists
            if (job.videoPath && fs.existsSync(job.videoPath)) {
                fs.unlinkSync(job.videoPath);
            }
            
            // Delete output directory if exists
            if (job.outputDir && fs.existsSync(job.outputDir)) {
                fs.rmSync(job.outputDir, { recursive: true, force: true });
            }
            
            await videoQuizDao.deleteJob(jobId);
            res.json({ message: "Job deleted successfully" });
            
        } catch (error) {
            console.error("Error deleting job:", error);
            res.status(500).json({ error: "Failed to delete job" });
        }
    });
    
    // Retry a failed job
    app.post("/api/video-quiz/jobs/:jobId/retry", async (req, res) => {
        try {
            const { jobId } = req.params;
            const job = await videoQuizDao.findJobById(jobId);
            
            if (!job) {
                return res.status(404).json({ error: "Job not found" });
            }
            
            if (job.status !== "error") {
                return res.status(400).json({ error: "Can only retry failed jobs" });
            }
            
            // Reset job status
            await videoQuizDao.updateJob(jobId, {
                status: "pending",
                progress: 0,
                progressMessage: "Retrying...",
                errorMessage: null,
                startedAt: null,
                completedAt: null
            });
            
            // Restart processing
            processVideo(jobId).catch(err => {
                console.error(`Retry processing error for job ${jobId}:`, err);
            });
            
            res.json({ message: "Job retry started" });
            
        } catch (error) {
            console.error("Error retrying job:", error);
            res.status(500).json({ error: "Failed to retry job" });
        }
    });
}
