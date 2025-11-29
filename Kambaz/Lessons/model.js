import mongoose from "mongoose";
import schema from "./schema.js";

const model = mongoose.model("LessonModel", schema);
export default model;
