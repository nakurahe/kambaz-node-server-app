import model from "./model.js";
import enrollmentModel from "../Enrollments/model.js";
import { v4 as uuidv4 } from "uuid";

export function findAllCourses() {
    return model.find();
}

export async function findCoursesForEnrolledUser(userId) {
    // Find all enrollments for this user
    const userEnrollments = await enrollmentModel.find({ user: userId });
    
    // Extract course IDs from enrollments
    const courseIds = userEnrollments.map(enrollment => enrollment.course);
    
    // Find courses where _id is in the courseIds array
    return model.find({ _id: { $in: courseIds } });
}

export function createCourse(course) {
    const newCourse = { ...course, _id: uuidv4() };
    return model.create(newCourse);
}

export function deleteCourse(courseId) {
    return model.deleteOne({ _id: courseId });
}

export function updateCourse(courseId, courseUpdates) {
    return model.updateOne({ _id: courseId }, { $set: courseUpdates });
}
