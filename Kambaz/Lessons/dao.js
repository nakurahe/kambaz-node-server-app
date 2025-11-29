import model from "./model.js";
import { v4 as uuidv4 } from "uuid";

// Find all lessons for a module
export function findLessonsForModule(moduleId) {
    return model.find({ module: moduleId }).sort({ createdAt: 1 });
}

// Find all lessons for a course
export function findLessonsForCourse(courseId) {
    return model.find({ course: courseId }).sort({ createdAt: 1 });
}

// Find a single lesson by ID
export function findLessonById(lessonId) {
    return model.findById(lessonId);
}

// Create a new lesson
export function createLesson(lesson) {
    const newLesson = {
        ...lesson,
        _id: uuidv4(),
        createdAt: new Date(),
        updatedAt: new Date()
    };
    return model.create(newLesson);
}

// Update a lesson
export function updateLesson(lessonId, updates) {
    return model.updateOne(
        { _id: lessonId },
        { $set: { ...updates, updatedAt: new Date() } }
    );
}

// Delete a lesson
export function deleteLesson(lessonId) {
    return model.deleteOne({ _id: lessonId });
}

// Delete all lessons for a module
export function deleteLessonsForModule(moduleId) {
    return model.deleteMany({ module: moduleId });
}

// Update quiz generation status
export function updateQuizGenerationStatus(lessonId, status, quizId = null, error = null) {
    const updates = {
        quizGenerationStatus: status,
        updatedAt: new Date()
    };
    if (quizId) {
        updates.quizId = quizId;
    }
    if (error) {
        updates.quizGenerationError = error;
    }
    return model.updateOne({ _id: lessonId }, { $set: updates });
}

// Update progress
export function updateProgress(lessonId, progress, progressMessage) {
    return model.updateOne(
        { _id: lessonId },
        { 
            $set: { 
                progress, 
                progressMessage,
                updatedAt: new Date()
            } 
        }
    );
}

// Find lesson by quiz ID
export function findLessonByQuizId(quizId) {
    return model.findOne({ quizId: quizId });
}
