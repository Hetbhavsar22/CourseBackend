const { string } = require("joi");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const courseSchema = new Schema(
  {
    adminId: {
      type: Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
    cname: {
      type: String,
      valiDate: {
        validator: function(v) {
            return /^[a-zA-Z0-9\s]+$/.test(v);
        },
        message: props => `${props.value} contains special characters, which are not allowed!`
    }
    },
    totalVideo: {
      type: Number,
    },
    courseImage: {
      type: String,
    },
    demoVideofile: {
      type: String,
    },
    hours: {
      type: Number,
    },
    author: {
      type: String,
      valiDate: {
        validator: function(v) {
            return /^[a-zA-Z0-9\s]+$/.test(v);
        },
        message: props => `${props.value} contains special characters, which are not allowed!`
    }
    },
    shortDescription: {
      type: String,
    },
    longDescription: {
      type: String,
    },
    language: {
      type: String,
    },
    price: {
      type: String,
    },
    dprice: {
      type: String,
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
    chapters: [
      {
        number: {
          type: Number,
        },
        name: {
          type: String,
        },
      },
    ],
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
