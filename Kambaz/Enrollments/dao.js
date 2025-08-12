import model from "./model.js";

export function enrollUserInCourse(userId, courseId) {
    const newEnrollment = { _id: `${userId}-${courseId}`, user: userId, course: courseId };
    return model.create(newEnrollment);
}

export function unenrollUserFromCourse(userId, courseId) {
    return model.deleteOne({ user: userId, course: courseId });
}

export function findEnrollmentsForUser(userId) {
    return model.find({ user: userId });
}

export async function findUsersForCourse(courseId) {
    const enrollments = await model.find({ course: courseId }).populate("user");
    return enrollments.map((enrollment) => enrollment.user);
}

export async function findCoursesForUser(userId) {
    const enrollments = await model.find({ user: userId }).populate("course");
    return enrollments.map((enrollment) => enrollment.course);
}
