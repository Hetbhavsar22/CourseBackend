const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const courseSchema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    cname: {
      type: String,
      required: true,
      unique: true,
    },
    hours: {
      type: Number,
      required: true,
      unique: true,
    },
    description: {
      type: String,
      required: true,
      unique: true,
    },
    language: {
      type: String,
      required: true,
      unique: true,
    },
    price: {
      type: Number,
      required: true,
    },
    dprice: {
      type: Number,
      required: true,
    },
    courseType: {
      type: String,
      required: true,
      // enum: ["80% complete", "all open", "time to time"],
    },
    percentage: {
      type: Number,
    },
    startTime: {
      type: Date,
    },
    endTime: {
      type: Date,
    },
    active: {
      type: Boolean,
      default: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    sequence: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

const Course = mongoose.model("CourseList", courseSchema);

module.exports = Course;
