const { body, validationResult } = require("express-validator");
const mongoose = require("mongoose");
const Course = require("../Model/courseModel");
const User = require("../Model/userModel");

// Validation rules
const courseValidationRules = [
  body("cname")
    .isLength({ min: 1, max: 50 })
    .withMessage("Course name must be between 1 and 50 characters long"),
  body("hours").isNumeric().withMessage("Hours must be a number"),
  body("price").isNumeric().withMessage("Price must be a number"),
  body("description")
    .isLength({ min: 1, max: 500 })
    .withMessage("Description must be between 1 and 500 characters long"),
  body("language")
    .isLength({ min: 1, max: 50 })
    .withMessage("Language must be between 1 and 50 characters long"),
  body("dprice").isNumeric().withMessage("Discounted Price must be a number"),
  body("courseType")
    .isIn(["percentage", "all open", "timeIntervals"])
    .withMessage("Invalid type selected"),
  body("percentage")
    .if(body("courseType").equals("percentage"))
    .isNumeric()
    .withMessage("Percentage must be a number for Percentage type"),
  body("startTime")
    .if(body("courseType").equals("timeIntervals"))
    .isLength({ min: 1 })
    .withMessage("Start time must be specified for time Intervals type"),
  body("endTime")
    .if(body("courseType").equals("timeIntervals"))
    .isLength({ min: 1 })
    .withMessage("End time must be specified for time Intervals type"),
];

// Middleware to handle validation errors
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Controller to create a new course
const createCourse = async (req, res) => {
  try {
    const {
      cname,
      hours,
      description,
      language,
      price,
      dprice,
      courseType,
      percentage,
      startTime,
      endTime,
    } = req.body;
    const { userId } = req.params;
    // const { userId } = req.user;
    const existingCourse = await Course.findOne({
      cname,
      hours,
      price,
      description,
      language,
      dprice,
      courseType,
      percentage,
      startTime,
      endTime,
    });
    if (existingCourse) {
      return res
      .status(400)
        .json({ errors: "Course with the same details already exists" });
      }
      
      const course = new Course({
        userId,
        cname,
        hours,
        price,
        description,
        language,
        dprice,
        courseType,
        percentage: courseType === "percentage" ? percentage : null,
        startTime: courseType === "timeIntervals" ? startTime : null,
        endTime: courseType === "timeIntervals" ? endTime : null,
        createdBy: userId,
      });
      
      console.log(req.body);
      const savedCourse = await course.save();
    res.status(200).json(savedCourse);
  } catch (error) {
    console.error("Error creating course:", error);
    res.status(500).json({ error: "Failed to create course" });
  }
};

// Controller to get all courses
const getAllCourses = async (req, res) => {
  try {
    const { search } = req.query;

    const query = {};
    if (search) {
      query.cname = new RegExp(search, 'i'); // Case-insensitive search
    }

    const courses = await Course.find(query);
    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Controller to get a course by ID
// const getCourseById = async (req, res) => {
//   try {
//     const courseId = req.params.id;

//     if (!mongoose.Types.ObjectId.isValid(courseId)) {
//       return res.status(400).json({ error: "Invalid course ID" });
//     }

//     const course = await Course.findById(courseId);
//     if (!course) {
//       return res.status(404).json({ error: "Course not found" });
//     }
//     res.status(200).json(course);
//   } catch (error) {
//     console.error("Error fetching course:", error);
//     res.status(500).json({ error: "Failed to fetch course" });
//   }
// };


const updateCourse = async (req, res) => {

    // Extract video ID from the request parameters
    const courseId = req.params.courseId;
    if (!courseId) {
      return res.status(400).json({ error: "Course ID is required" });
    }

    // Extract updated fields from the request body
    const {
      cname,
      hours,
      description,
      language,
      price,
      dprice,
      courseType,
    } = req.body;

    console.log(req.body);
    // console.log(updatedBy);
    console.log(courseType);
    // Validate required fields
    if (!courseId || !courseType) {
      return res.status(400).json({ error: "Required fields are missing" });
    }

    try {
      // Find the video document by ID
      const course = await Course.findById(courseId);
      if (!course) {
        return res.status(404).json({ error: "Course not found" });
      }
  
      // Update the video document with new data
      course.cname = cname || course.cname;
      course.hours = hours || course.hours;
      course.description = description || course.description;
      course.language = language || course.language;
      course.price = price || course.price;
      course.dprice = dprice || course.dprice;
      course.courseId = courseId || course.courseId;
      course.courseType = courseType || course.courseType;
      if (courseType === "percentage") {
        course.percentage = req.body.percentage || course.percentage;
      }
      if (courseType === "timeIntervals") {
        course.startTime = req.body.startTime || course.startTime;
        course.endTime = req.body.endTime || course.endTime;
      }
      // Save the updated video document
      const updatedCourse = await course.save();
      res.json({ message: "Course updated successfully", course: updatedCourse });
    } catch (err) {
      console.error("Database update error:", err.message);
      res.status(500).json({ error: err.message });
    }
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

module.exports = {
  createCourse,
  getAllCourses,
  // getCourseById,
  updateCourse,
  deleteCourse,
  courseValidationRules,
  validate,
};
