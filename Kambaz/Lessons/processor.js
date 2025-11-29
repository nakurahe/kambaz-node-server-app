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
        
        // Capture stdout
        pythonProcess.stdout.on("data", (data) => {
            const output = data.toString();
            stdout += output;
            console.log(`[Lesson ${lessonId} Pipeline] ${output}`);
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
        
        // Update lesson with quiz reference
        await lessonDao.updateQuizGenerationStatus(lessonId, "completed", createdQuiz._id);
        
        // Update quiz with lesson reference
        await quizzesDao.updateQuiz(createdQuiz._id, { lesson: lessonId });
        
        console.log(`Lesson ${lessonId} quiz generation completed successfully`);
        
    } catch (error) {
        console.error(`Lesson ${lessonId} quiz generation failed:`, error);
        
        await lessonDao.updateQuizGenerationStatus(
            lessonId, 
            "error", 
            null, 
            error.message
        );
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
