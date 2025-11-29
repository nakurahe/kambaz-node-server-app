import mongoose from "mongoose";
import videoQuizJobSchema from "./schema.js";

const VideoQuizJobModel = mongoose.model("VideoQuizJobModel", videoQuizJobSchema);

export default VideoQuizJobModel;
