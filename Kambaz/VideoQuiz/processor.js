/**
 * Video Quiz Processor
 * Spawns Python pipeline and handles quiz generation
 */

import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import * as videoQuizDao from "./dao.js";
import * as quizzesDao from "../Quizzes/dao.js";
import * as questionsDao from "../Questions/dao.js";
import { transformPipelineOutput } from "./transformer.js";

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the pipeline directory - resolve relative to project root
const PROJECT_ROOT = path.resolve(__dirname, "../..");
const PIPELINE_DIR = process.env.PIPELINE_DIR 
    ? path.resolve(PROJECT_ROOT, process.env.PIPELINE_DIR)
    : path.resolve(PROJECT_ROOT, "pipeline");

// Resolve Python path - handle relative paths
const PYTHON_PATH = process.env.PYTHON_PATH 
    ? (path.isAbsolute(process.env.PYTHON_PATH) 
        ? process.env.PYTHON_PATH 
        : path.resolve(PROJECT_ROOT, process.env.PYTHON_PATH))
    : "python3";

/**
 * Process a video and generate quiz
 * @param {string} jobId - The job ID
 */
export async function processVideo(jobId) {
    let job;
    
    try {
        // Get job details
        job = await videoQuizDao.findJobById(jobId);
        if (!job) {
            console.error(`Job ${jobId} not found`);
            return;
        }
        
        // Update status to processing
        await videoQuizDao.updateJobStatus(jobId, "processing", "Starting video processing...");
        await videoQuizDao.updateJobProgress(jobId, 5, "Initializing pipeline...");
        
        // Convert relative video path to absolute path
        const videoPath = path.isAbsolute(job.videoPath) 
            ? job.videoPath 
            : path.resolve(PROJECT_ROOT, job.videoPath);
        const outputDir = job.outputDir 
            ? (path.isAbsolute(job.outputDir) ? job.outputDir : path.resolve(PROJECT_ROOT, job.outputDir))
            : path.join(PIPELINE_DIR, "output", jobId);
        
        // Verify video file exists
        if (!fs.existsSync(videoPath)) {
            throw new Error(`Video file not found: ${videoPath}`);
        }
        
        // Ensure output directory exists
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        // Spawn Python pipeline
        const pipelineScript = path.join(PIPELINE_DIR, "run_pipeline.py");
        
        console.log(`Starting pipeline for job ${jobId}`);
        console.log(`Video: ${videoPath}`);
        console.log(`Output: ${outputDir}`);
        
        const pythonProcess = spawn(PYTHON_PATH, [
            pipelineScript,
            videoPath,
            "--output", outputDir,
            "--questions", String(job.numQuestions || 10),
            "--difficulty", job.difficulty || "medium"
        ], {
            cwd: PIPELINE_DIR,
            env: { ...process.env }
        });
        
        let stdout = "";
        let stderr = "";
        
        // Capture stdout for progress updates
        pythonProcess.stdout.on("data", async (data) => {
            const output = data.toString();
            stdout += output;
            console.log(`[Pipeline ${jobId}] ${output}`);
            
            // Parse progress from output
            if (output.includes("Extracting slides")) {
                await videoQuizDao.updateJobProgress(jobId, 20, "Extracting slides from video...");
            } else if (output.includes("Transcribing audio")) {
                await videoQuizDao.updateJobProgress(jobId, 40, "Transcribing audio...");
            } else if (output.includes("Generating quizzes")) {
                await videoQuizDao.updateJobProgress(jobId, 70, "Generating quiz questions...");
            } else if (output.includes("PIPELINE COMPLETE")) {
                await videoQuizDao.updateJobProgress(jobId, 90, "Finalizing...");
            }
        });
        
        pythonProcess.stderr.on("data", (data) => {
            stderr += data.toString();
            console.error(`[Pipeline ${jobId} ERROR] ${data}`);
        });
        
        // Wait for process to complete
        const exitCode = await new Promise((resolve) => {
            pythonProcess.on("close", resolve);
        });
        
        if (exitCode !== 0) {
            throw new Error(`Pipeline failed with exit code ${exitCode}: ${stderr}`);
        }
        
        // Read generated quiz JSON
        const quizJsonPath = path.join(outputDir, "quiz_multimodal.json");
        if (!fs.existsSync(quizJsonPath)) {
            throw new Error("Quiz JSON not generated");
        }
        
        const quizJson = JSON.parse(fs.readFileSync(quizJsonPath, "utf-8"));
        
        // Transform to Kambaz format
        const { quiz, questions } = transformPipelineOutput(quizJson, job.course, {
            title: `Quiz from ${job.videoFileName}`
        });
        
        // Save quiz to database
        const createdQuiz = await quizzesDao.createQuiz(quiz);
        console.log(`Created quiz: ${createdQuiz._id}`);
        
        // Save questions to database
        for (const question of questions) {
            await questionsDao.createQuestion(question);
        }
        console.log(`Created ${questions.length} questions`);
        
        // Update job as completed
        await videoQuizDao.updateJob(jobId, {
            status: "completed",
            progress: 100,
            progressMessage: "Quiz generated successfully!",
            generatedQuizId: createdQuiz._id,
            quizJson: JSON.stringify(quizJson),
            completedAt: new Date()
        });
        
        console.log(`Job ${jobId} completed successfully`);
        
    } catch (error) {
        console.error(`Job ${jobId} failed:`, error);
        
        await videoQuizDao.updateJob(jobId, {
            status: "error",
            progress: 0,
            progressMessage: "Processing failed",
            errorMessage: error.message,
            completedAt: new Date()
        });
    }
}

/**
 * Check if pipeline is available
 * @returns {boolean}
 */
export function isPipelineAvailable() {
    const pipelineScript = path.join(PIPELINE_DIR, "run_pipeline.py");
    return fs.existsSync(pipelineScript);
}

/**
 * Get pipeline status
 * @returns {Object}
 */
export function getPipelineStatus() {
    return {
        available: isPipelineAvailable(),
        pipelineDir: PIPELINE_DIR,
        pythonPath: PYTHON_PATH
    };
}
