const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const courseSchema = new Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
    cname: {
      type: String,
    },
    totalVideo: {
      type: Number,
    },
    courseImage: {
      type: String,
    },
    hours: {
      type: Number,
    },
    description: {
      type: String,
    },
    language: {
      type: String,
    },
    price: {
      type: Number,
    },
    dprice: {
      type: Number,
    },
    courseGst: {
      type: Number,
    },
    courseType: {
      type: String,
      // enum: ["80% complete", "all open", "time to time"],
    },
    percentage: {
      type: Number,
    },
    startTime: {
      type: Date
    },
    endTime: {
      type: Date
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
      type: String,
      ref: "Admin",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
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
