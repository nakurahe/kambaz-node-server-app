import model from "./model.js";
import { v4 as uuidv4 } from "uuid";

export function findJobsForCourse(courseId) {
    return model.find({ course: courseId }).sort({ createdAt: -1 });
}

export function findJobsByUser(userId) {
    return model.find({ createdBy: userId }).sort({ createdAt: -1 });
}

export function findAllJobs() {
    return model.find().sort({ createdAt: -1 });
}

export function findJobById(jobId) {
    return model.findById(jobId);
}

export function createJob(jobData) {
    const newJob = { ...jobData, _id: uuidv4() };
    return model.create(newJob);
}

export function updateJob(jobId, updates) {
    return model.updateOne({ _id: jobId }, { $set: updates });
}

export function updateJobStatus(jobId, status, message = null) {
    const updates = { status };
    if (message) {
        updates.progressMessage = message;
    }
    if (status === "processing") {
        updates.startedAt = new Date();
    }
    if (status === "completed" || status === "error") {
        updates.completedAt = new Date();
    }
    return model.updateOne({ _id: jobId }, { $set: updates });
}

export function updateJobProgress(jobId, progress, message) {
    return model.updateOne(
        { _id: jobId }, 
        { $set: { progress, progressMessage: message } }
    );
}

export function deleteJob(jobId) {
    return model.deleteOne({ _id: jobId });
}

export function deleteJobsForCourse(courseId) {
    return model.deleteMany({ course: courseId });
}
