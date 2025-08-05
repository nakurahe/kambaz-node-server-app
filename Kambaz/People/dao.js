import Database from "../Database/index.js";
import { v4 as uuidv4 } from "uuid";

export function findPeopleForCourse(courseId) {
    const { users, enrollments } = Database;
    const enrolledUserIds = enrollments
        .filter((enrollment) => enrollment.course === courseId)
        .map((enrollment) => enrollment.user);
    return users.filter((user) => enrolledUserIds.includes(user._id));
}

export function createPerson(person) {
    const newPerson = { ...person, _id: uuidv4() };
    Database.users = [...Database.users, newPerson];
    return newPerson;
}

export function deletePerson(personId) {
    const { users } = Database;
    Database.users = users.filter((user) => user._id !== personId);
}

export function updatePerson(personId, personUpdates) {
    const { users } = Database;
    const person = users.find((user) => user._id === personId);
    if (!person) {
        return null;
    }
    Object.assign(person, personUpdates);
    return person;
}