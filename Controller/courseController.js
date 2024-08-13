// const { body, validationResult } = require("express-validator");
const mongoose = require("mongoose");
const Course = require("../Model/courseModel");
const userModel = require("../Model/userModel");
const adminModel = require("../Model/adminModel");
const Enrollment = require("../Model/enrollmentModel"); 
const upload = require("../middleware/upload");
const path = require("path");
const fs = require("fs");

// Validation rules
// const courseValidationRules = [
//   body("cname")
//     .isLength({ min: 1, max: 50 })
//     .withMessage("Course name must be between 1 and 50 characters long"),
//   body("hours").isNumeric().withMessage("Hours must be a number"),
//   body("price").isNumeric().withMessage("Price must be a number"),
//   body("description")
//     .isLength({ min: 1, max: 500 })
//     .withMessage("Description must be between 1 and 500 characters long"),
//   body("language")
//     .isLength({ min: 1, max: 50 })
//     .withMessage("Language must be between 1 and 50 characters long"),
//   body("dprice").isNumeric().withMessage("Discounted Price must be a number"),
//   body("courseType")
//     .isIn(["percentage", "all open", "timeIntervals"])
//     .withMessage("Invalid type selected"),
//   body("percentage")
//     .if(body("courseType").equals("percentage"))
//     .isNumeric()
//     .withMessage("Percentage must be a number for Percentage type"),
//   body("startTime")
//     .if(body("courseType").equals("timeIntervals"))
//     .isLength({ min: 1 })
//     .withMessage("Start time must be specified for time Intervals type"),
//   body("endTime")
//     .if(body("courseType").equals("timeIntervals"))
//     .isLength({ min: 1 })
//     .withMessage("End time must be specified for time Intervals type"),
// ];

// // Middleware to handle validation errors
// const validate = (req, res, next) => {
//   const errors = validationResult(req);
//   if (!errors.isEmpty()) {
//     return res.status(400).json({ errors: errors.array() });
//   }
//   next();
// };

// Controller to create a new course
const createCourse = async (req, res) => {

    upload(req, res, async (err) => {
      if (err) {
        console.error("Error uploading file:", err.message);
        return res.status(400).json({ error: err.message });
      }

    try {
      const {
        cname,
        totalVideo,
        hours,
        description,
        language,
        price,
        dprice,
        courseGst,
        courseType,
        percentage,
        startTime,
        endTime,
      } = req.body;
      const { adminId } = req.params;
      const courseImage = req.files && req.files.courseImage ? req.files.courseImage[0].path : null;
      // const { adminId } = req.admin;
      const existingCourse = await Course.findOne({
        cname,
      });
      if (existingCourse) {
        return res
          .status(400)
          .json({ errors: "Course with the same details already exists" });
      }
      // Fetch admin's name using adminId
      const admin = await adminModel.findById(adminId);
      if (!admin) {
        return res.status(404).json({ error: "Admin not found" });
      }

      const course = new Course({
        adminId,
        cname,
        totalVideo,
        courseImage,
        hours,
        description,
        language,
        price,
        dprice,
        courseGst,
        courseType,
        percentage: courseType === "percentage" ? percentage : null,
        startTime: courseType === "timeIntervals" ? startTime : null,
        endTime: courseType === "timeIntervals" ? endTime : null,
        createdBy: admin.name,
      });

      console.log(req.body);
      const savedCourse = await course.save();
      res.status(200).json(savedCourse);
    } catch (error) {
      console.error("Error creating course:", error);
      res.status(500).json({ error: "Failed to create course" });
    }
  });
};

const getAllCourses = async (req, res) => {
  try {
    const { search, page = 1, limit = 4, sortBy = 'cname', order = 'asc' } = req.query;

    const query = {};
    if (search) {
      query.cname = new RegExp(search, "i");
    }

    // Calculate the total number of courses that match the query
    const totalCourses = await Course.countDocuments(query);

    // Calculate the total number of pages
    const pageCount = Math.ceil(totalCourses / limit);

    // Fetch the courses for the current page
    const courses = await Course.find(query)
    .sort({ [sortBy]: order === 'asc' ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({
      courses,
      page: parseInt(page),
      pageCount,
      totalCourses,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Controller to get a course by ID
 const getCourseById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate the ID format (assuming you use MongoDB ObjectId)
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid course ID" });
    }

    // Find the course by ID
    const course = await Course.findById(id);

    // Check if the course exists
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Send the course details as a response
    res.json(course);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


const updateCourse = async (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      console.error("Error uploading file:", err.message);
      return res.status(400).json({ error: err.message });
    }

    const courseId = req.params.courseId;
    if (!courseId) {
      return res.status(400).json({ error: "Course ID is required" });
    }

    const { cname, totalVideo, hours, description, language, price, dprice, courseType, percentage, startTime, endTime } = req.body;
    const courseImage = req.file ? req.file.filename : undefined;

    if (!courseId || !courseType) {
      return res.status(400).json({ error: "Required fields are missing" });
    }

    try {
      const course = await Course.findById(courseId);
      if (!course) {
        return res.status(404).json({ error: "Course not found" });
      }

      course.cname = cname || course.cname;
      course.totalVideo = totalVideo || course.totalVideo;
      course.courseImage = courseImage || course.courseImage;
      course.hours = hours || course.hours;
      course.description = description || course.description;
      course.language = language || course.language;
      course.price = price || course.price;
      course.dprice = dprice || course.dprice;
      course.courseType = courseType || course.courseType;
      if (courseType === "percentage") {
        course.percentage = percentage || course.percentage;
      }
      if (courseType === "timeIntervals") {
        course.startTime = startTime || course.startTime;
        course.endTime = endTime || course.endTime;
      }

      const updatedCourse = await course.save();
      res.json({ message: "Course updated successfully", course: updatedCourse });
    } catch (err) {
      console.error("Database update error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });
};

// Controller to delete a course
const deleteCourse = async (req, res) => {
  try {
    const deletedCourse = await Course.findByIdAndDelete(req.params.id);
    if (!deletedCourse) {
      return res.status(404).json({ error: "Course not found" });
    }
    res.status(200).json({ message: "Course deleted successfully" });
  } catch (error) {
    console.error("Error deleting course:", error);
    res.status(500).json({ error: "Failed to delete course" });
  }
};

const courseCheckout = async (req, res) => {

  const { courseId, userId } = req.body;

  try {
    // Find the course and user
    const course = await Course.findById(courseId);
    const user = await userModel.findById(userId);

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if the course has a valid adminId
    if (!course.adminId) {
      return res.status(400).json({ message: "Course has no adminId assigned" });
    }

    // Check if the user is already enrolled in the course
    const existingEnrollment = await Enrollment.findOne({ courseId: courseId, userId: userId });

    if (existingEnrollment) {
      return res.status(400).json({ message: "User already enrolled in this course" });
    }

    // Create a new enrollment record
    const EnrollCourse = new Enrollment({
      courseId: courseId,
      userId: userId,
      enrolledAt: new Date(),
    });

    await EnrollCourse.save();

    res.status(201).json({ message: "Enrollment successful", EnrollCourse });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  createCourse,
  getAllCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  courseCheckout,
  // courseValidationRules,
  // validate,
};
