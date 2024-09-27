const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const videoProgressSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    videoId: {
      type: Schema.Types.ObjectId,
      ref: "Videos",
      required: true,
    },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    progress: {
      type: Number, // store the progress in percentage (e.g., 50 for 50%)
      required: true,
    },
    completed: {
      type: Boolean,
      default: false,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const VideoProgress = mongoose.model("VideoProgress", videoProgressSchema);

module.exports = VideoProgress;
