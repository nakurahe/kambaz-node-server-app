/**
 * Lesson Video Processor
 * Handles quiz generation for lessons using the pipeline
 */

import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import * as lessonDao from "./dao.js";
import * as quizzesDao from "../Quizzes/dao.js";
import * as questionsDao from "../Questions/dao.js";
import { transformPipelineOutput } from "../VideoQuiz/transformer.js";

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
 * Process a lesson video and generate quiz
 * @param {string} lessonId - The lesson ID
 * @param {Object} options - Quiz generation options
 */
export async function processLessonVideo(lessonId, options = {}) {
    const { numQuestions = 10, difficulty = "medium" } = options;
    
    try {
        // Get lesson details
        const lesson = await lessonDao.findLessonById(lessonId);
        if (!lesson) {
            console.error(`Lesson ${lessonId} not found`);
            return;
        }
        
        // Update status to processing
        await lessonDao.updateQuizGenerationStatus(lessonId, "processing");
        
        // Convert relative video path to absolute path
        const videoPath = path.isAbsolute(lesson.videoPath) 
            ? lesson.videoPath 
            : path.resolve(PROJECT_ROOT, lesson.videoPath);
        const outputDir = path.join(PIPELINE_DIR, "output", `lesson-${lessonId}`);
        
        // Verify video file exists
        if (!fs.existsSync(videoPath)) {
            throw new Error(`Video file not found: ${videoPath}`);
        }
        
        // Ensure output directory exists
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        // Check pipeline availability
        const pipelineScript = path.join(PIPELINE_DIR, "run_pipeline.py");
        if (!fs.existsSync(pipelineScript)) {
            throw new Error("Pipeline script not found");
        }
        
        console.log(`Starting pipeline for lesson ${lessonId}`);
        console.log(`Video: ${videoPath}`);
        console.log(`Output: ${outputDir}`);
        
        // Update initial progress
        await lessonDao.updateProgress(lessonId, 0, "Starting pipeline...");
        
        // Use -u flag for unbuffered Python output
        const pythonProcess = spawn(PYTHON_PATH, [
            "-u",
            pipelineScript,
            videoPath,
            "--output", outputDir,
            "--questions", String(numQuestions),
            "--difficulty", difficulty
        ], {
            cwd: PIPELINE_DIR,
            env: { ...process.env }
        });
        
        let stdout = "";
        let stderr = "";
        
        // Capture stdout and parse progress
        pythonProcess.stdout.on("data", async (data) => {
            const output = data.toString();
            stdout += output;
            console.log(`[Lesson ${lessonId} Pipeline] ${output}`);
            
            // Parse progress from output
            const progressInfo = parseProgress(output);
            if (progressInfo) {
                await lessonDao.updateProgress(lessonId, progressInfo.progress, progressInfo.message);
            }
        });
        
        pythonProcess.stderr.on("data", (data) => {
            stderr += data.toString();
            console.error(`[Lesson ${lessonId} Pipeline ERROR] ${data}`);
        });
        
        // Wait for process to complete
        const exitCode = await new Promise((resolve) => {
            pythonProcess.on("close", resolve);
        });
        
        if (exitCode !== 0) {
            throw new Error(`Pipeline failed with exit code ${exitCode}: ${stderr}`);
        }
        
        // Update progress before reading quiz
        await lessonDao.updateProgress(lessonId, 95, "Saving quiz to database...");
        
        // Read generated quiz JSON
        const quizJsonPath = path.join(outputDir, "quiz_multimodal.json");
        if (!fs.existsSync(quizJsonPath)) {
            throw new Error("Quiz JSON not generated");
        }
        
        const quizJson = JSON.parse(fs.readFileSync(quizJsonPath, "utf-8"));
        
        // Transform to Kambaz format
        const { quiz, questions } = transformPipelineOutput(quizJson, lesson.course, {
            title: `Quiz: ${lesson.name}`
        });
        
        // Add lesson reference to quiz
        quiz.lesson = lessonId;
        
        // Save quiz to database
        const createdQuiz = await quizzesDao.createQuiz(quiz);
        console.log(`Created quiz: ${createdQuiz._id} for lesson ${lessonId}`);
        
        // Save questions to database
        for (const question of questions) {
            question.quiz = createdQuiz._id;
            await questionsDao.createQuestion(question);
        }
        console.log(`Created ${questions.length} questions`);
        
        // Update lesson with quiz reference and final progress
        await lessonDao.updateProgress(lessonId, 100, "Quiz generation completed!");
        await lessonDao.updateQuizGenerationStatus(lessonId, "completed", createdQuiz._id);
        
        // Update quiz with lesson reference
        await quizzesDao.updateQuiz(createdQuiz._id, { lesson: lessonId });
        
        console.log(`Lesson ${lessonId} quiz generation completed successfully`);
        
    } catch (error) {
        console.error(`Lesson ${lessonId} quiz generation failed:`, error);
        
        await lessonDao.updateProgress(lessonId, 0, `Error: ${error.message}`);
        await lessonDao.updateQuizGenerationStatus(
            lessonId, 
            "error", 
            null, 
            error.message
        );
    }
}

/**
 * Parse progress from pipeline output
 * @param {string} output - Pipeline stdout output
 * @returns {Object|null} - { progress, message } or null
 */
function parseProgress(output) {
    // Match progress patterns from the pipeline
    const lines = output.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
        // Pattern: "Step X/Y: description" or percentage patterns
        const stepMatch = line.match(/Step\s+(\d+)\/(\d+):\s*(.+)/i);
        if (stepMatch) {
            const current = parseInt(stepMatch[1]);
            const total = parseInt(stepMatch[2]);
            const message = stepMatch[3].trim();
            const progress = Math.round((current / total) * 90); // Reserve 10% for final steps
            return { progress, message };
        }
        
        // Pattern: "Progress: XX%" 
        const percentMatch = line.match(/Progress:\s*(\d+)%/i);
        if (percentMatch) {
            return { progress: parseInt(percentMatch[1]), message: line.trim() };
        }
        
        // Pattern: "[STAGE] message"
        const stageMatch = line.match(/\[(AUDIO|VIDEO|TRANSCRIPT|SLIDES|QUIZ|OCR|LLM)\]\s*(.+)/i);
        if (stageMatch) {
            const stage = stageMatch[1].toUpperCase();
            const message = stageMatch[2].trim();
            const stageProgress = {
                'AUDIO': 10,
                'VIDEO': 20,
                'OCR': 30,
                'SLIDES': 40,
                'TRANSCRIPT': 50,
                'LLM': 70,
                'QUIZ': 85
            };
            return { progress: stageProgress[stage] || 50, message: `${stage}: ${message}` };
        }
        
        // Check for common stage messages
        if (line.includes("Extracting audio")) {
            return { progress: 10, message: "Extracting audio from video..." };
        }
        if (line.includes("Transcribing")) {
            return { progress: 25, message: "Transcribing audio..." };
        }
        if (line.includes("Processing slides") || line.includes("Detecting slides")) {
            return { progress: 40, message: "Processing video slides..." };
        }
        if (line.includes("OCR") || line.includes("text extraction")) {
            return { progress: 55, message: "Extracting text from slides..." };
        }
        if (line.includes("Generating quiz") || line.includes("LLM")) {
            return { progress: 70, message: "Generating quiz questions..." };
        }
        if (line.includes("complete") || line.includes("finished") || line.includes("done")) {
            return { progress: 90, message: line.trim() };
        }
    }
    
    return null;
}

/**
 * Check if pipeline is available
 * @returns {boolean}
 */
export function isPipelineAvailable() {
    const pipelineScript = path.join(PIPELINE_DIR, "run_pipeline.py");
    return fs.existsSync(pipelineScript);
}
