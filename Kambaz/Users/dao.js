import model from "./models.js";
import { v4 as uuidv4 } from "uuid";

export const createUser = (user) => {
    const newUser = { ...user, _id: uuidv4() };
    return model.create(newUser);
};

export const findAllUsers = () => model.find();
export const findUserById = (userId) => model.findById(userId);
export const findUserByUsername = (username) => model.findOne({ username });
export const findUserByCredentials = (username, password) =>
    model.findOne({ username, password });
export const updateUser = (userId, user) =>
    model.findByIdAndUpdate({ _id: userId }, { $set: user });
export const deleteUser = (userId) => model.findByIdAndDelete({ _id: userId });
export const findUsersByRole = (role) => model.find({ role });
export const findUsersByPartialName = (partialName) => {
    const regex = new RegExp(partialName, "i"); // 'i' makes it case-insensitive
    return model.find({
        $or: [
            { firstName: { $regex: regex } },
            { lastName: { $regex: regex } },
        ],
    });
};
