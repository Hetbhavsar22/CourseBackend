const mongoose = require("mongoose");
const Course = require("../../Model/courseModel");
const Video = require("../../Model/videoModel");
const userModel = require("../../Model/userModel");
const adminModel = require("../../Model/adminModel");
const Enrollment = require("../../Model/enrollmentModel");
const Order = require("../../Model/oder_IdModel");
const upload = require("../../middleware/upload");
const path = require("path");
const fs = require("fs");
const { body, validationResult } = require("express-validator");
const util = require("util");
const jwt = require("jsonwebtoken");

const createCourse = async (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      console.error("Error uploading file:", err.message);
      return res.json({
        status: 400,
        message: err.message,
      });
    }

    try {
      const token = req.headers.authorization.split(" ")[1];
      const decodedToken = jwt.verify(token, process.env.SECRET_KEY);
      const adminId = decodedToken.id;

      await Promise.all([
        body("cname")
          .notEmpty()
          .withMessage("Course name is required")
          .isLength({ min: 1, max: 50 })
          .withMessage("Course name must be between 1 and 50 characters long")
          .custom((value) => {
            const specialCharRegex = /[^a-zA-Z0-9\s]/;
            if (specialCharRegex.test(value)) {
              throw new Error(
                "Course name should not contain special characters."
              );
            }
            return true;
          })
          .run(req),
        body("totalVideo")
          .notEmpty()
          .withMessage("Total video count is required")
          .isInt()
          .withMessage("Total video count must be an integer")
          .run(req),
        body("hours")
          .notEmpty()
          .withMessage("Total hours are required")
          .isFloat()
          .withMessage("Hours must be a number")
          .run(req),
        body("shortDescription")
          .notEmpty()
          .withMessage("Short description is required")
          // .isLength({ min: 1, max: 100 })
          // .withMessage("Description must be between 1 and 100 characters long")
          .run(req),
        body("longDescription")
          .notEmpty()
          .withMessage("Long description is required")
          // .isLength({ min: 1, max: 500 })
          // .withMessage("Description must be between 1 and 500 characters long")
          .run(req),
        body("language")
          .notEmpty()
          .withMessage("Language is required")
          .run(req),
        body("price")
          .notEmpty()
          .withMessage("Price is required")
          .isFloat()
          .withMessage("Price must be a number")
          .custom((value) => {
            if (value > 500000) {
              throw new Error("Price must be less than or equal to 5 lakhs.");
            }
            return true;
          })
          .run(req),
        body("dprice")
          .notEmpty()
          .withMessage("Display Price is required")
          .isFloat()
          .withMessage("Display Price must be a number")
          .run(req),
        body("courseType")
          .notEmpty()
          .withMessage("Course type is required")
          .run(req),
        body("percentage")
          .optional()
          .isFloat({ min: 10, max: 100 })
          .withMessage("Percentage should be between 10 and 100.")
          .run(req),
      ]);

      const validationErrorObj = validationResult(req);
      if (!validationErrorObj.isEmpty()) {
        return res.json({
          status: 401,
          message: validationErrorObj.errors[0].msg,
        });
      }

      const {
        cname,
        totalVideo,
        hours,
        shortDescription,
        longDescription,
        language,
        price,
        dprice,
        courseGst,
        courseType,
        percentage,
        startTime,
        endTime,
      } = req.body;

      const courseImage =
        req.files && req.files.courseImage
          ? req.files.courseImage[0].path
          : null;

      const existingCourse = await Course.findOne({ cname });
      if (existingCourse) {
        return res.json({
          status: 401,
          message: "Course with the same details already exists",
        });
      }

      const admin = await adminModel.findById(adminId);
      if (!admin || !mongoose.Types.ObjectId.isValid(adminId)) {
        return res.json({
          status: 401,
          message: "Admin not found",
        });
      }

      const finalPrice = price === "0" ? "Free" : price;
      const finalDprice = dprice === "0" ? "Free" : dprice;

      const course = new Course({
        adminId,
        cname,
        totalVideo,
        courseImage,
        hours,
        shortDescription,
        longDescription,
        language,
        price: finalPrice,
        dprice: finalDprice,
        courseGst,
        courseType,
        percentage: courseType === "percentage" ? percentage : null,
        startTime: courseType === "timeIntervals" ? startTime : null,
        endTime: courseType === "timeIntervals" ? endTime : null,
        createdBy: admin.name,
      });

      const savedCourse = await course.save();
      return res.json({
        status: 200,
        data: savedCourse,
      });
    } catch (error) {
      console.error("Error creating course:", error.message);
      return res.json({
        status: 500,
        message: "Failed to create course",
      });
    }
  });
};

const getAllCourses = async (req, res) => {
  try {
    const {
      search,
      page = 1,
      limit = 4,
      sortBy = "createdAt",
      order = "desc",
    } = req.query;

    const query = {};
    if (search) {
      query.cname = new RegExp(search, "i");
    }

    const totalCourses = await Course.countDocuments(query);

    const pageCount = Math.ceil(totalCourses / limit);

    const courses = await Course.find(query)
      .sort({ [sortBy]: order === "asc" ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({
      courses,
      page: parseInt(page),
      pageCount,
      totalCourses,
    });
  } catch (error) {
    res.json({
      status: 500,
      message: error.message,
    });
  }
};

const getCourseById = async (req, res) => {
  try {
    await param("id")
      .notEmpty()
      .withMessage("Course ID is required")
      .custom((value) => mongoose.Types.ObjectId.isValid(value))
      .withMessage("Invalid course ID")
      .run(req);

    const validationErrorObj = validationResult(req);
    if (!validationErrorObj.isEmpty()) {
      return res.json({
        status: 401,
        message: validationErrorObj.errors[0].msg,
      });
    }

    const { id } = req.params;

    const course = await Course.findById(id);

    if (!course) {
      return res.json({
        status: 404,
        message: "Course not found",
      });
    }

    return res.json({
      status: 200,
      data: course,
    });
  } catch (error) {
    console.error("Error fetching course by ID:", error.message);
    return res.json({
      status: 500,
      message: "Failed to fetch course",
    });
  }
};

const updateCourse = async (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      console.error("Error uploading file:", err.message);
      return res.json({
        status: 400,
        message: err.message,
      });
    }

    await Promise.all([
      body("cname")
        .notEmpty()
        .withMessage("Course name is required")
        .isLength({ min: 1, max: 50 })
        .withMessage("Course name must be between 1 and 50 characters long")
        .custom((value) => {
          const specialCharRegex = /[^a-zA-Z0-9\s]/;
          if (specialCharRegex.test(value)) {
            throw new Error(
              "Course name should not contain special characters."
            );
          }
          return true;
        })
        .run(req),

      body("totalVideo")
        .notEmpty()
        .withMessage("Total Videos cannot br empty")
        .isNumeric()
        .withMessage("Total video count must be a number")
        .run(req),

      body("hours")
        .notEmpty()
        .withMessage("Total Hours cannot be empty")
        .isNumeric()
        .withMessage("Hours must be a number")
        .run(req),

      body("shortDescription")
        .notEmpty()
        .withMessage("Short description cannot be empty")
        .isLength({ max: 250 })
        .withMessage("Short description cannot exceed 250 characters")
        .run(req),

      body("longDescription")
        .optional()
        .notEmpty()
        .withMessage("Long description cannot be empty")
        .run(req),

      body("language")
        .notEmpty()
        .withMessage("Language cannot be empty")
        .isIn(["english", "hindi", "gujarati"])
        .withMessage("Invalid language")
        .run(req),

      body("price")
        .notEmpty()
        .withMessage("Price is required")
        .isFloat()
        .withMessage("Price must be a number")
        .custom((value) => {
          if (value > 500000) {
            throw new Error("Price must be less than or equal to 5 lakhs.");
          }
          return true;
        })
        .run(req),
      body("dprice")
        .notEmpty()
        .withMessage("Display Price is required")
        .isFloat()
        .withMessage("Display Price must be a number")
        .run(req),

      body("courseType")
        .notEmpty()
        .withMessage("Course type is required")
        .run(req),
      body("percentage")
        .optional()
        .isFloat({ min: 10, max: 100 })
        .withMessage("Percentage should be between 10 and 100.")
        .run(req),
    ]);

    const validationErrorObj = validationResult(req);
    if (!validationErrorObj.isEmpty()) {
      return res.json({
        status: 401,
        message: validationErrorObj.errors[0].msg,
      });
    }

    const { courseId } = req.params;
    const {
      cname,
      totalVideo,
      hours,
      shortDescription,
      longDescription,
      language,
      price,
      dprice,
      courseGst,
      courseType,
      percentage,
      startTime,
      endTime,
    } = req.body;
    const courseImage =
      req.files && req.files.courseImage ? req.files.courseImage[0].path : null;

    try {
      const course = await Course.findById(courseId);
      if (!course) {
        return res.json({
          status: 404,
          message: "Course not found",
        });
      }

      const finalPrice = price === "0" ? "Free" : price;
      const finalDprice = dprice === "0" ? "Free" : dprice;

      course.cname = cname || course.cname;
      course.totalVideo = totalVideo || course.totalVideo;
      course.courseImage = courseImage || course.courseImage;
      course.hours = hours || course.hours;
      course.shortDescription = shortDescription || course.shortDescription;
      course.longDescription = longDescription || course.longDescription;
      course.language = language || course.language;
      course.price = finalPrice || course.finalPrice;
      course.dprice = finalDprice || course.finalDprice;
      course.courseGst = courseGst || course.courseGst;
      course.courseType = courseType || course.courseType;
      if (courseType === "percentage") {
        course.percentage = percentage || course.percentage;
      }
      if (courseType === "timeIntervals") {
        course.startTime = startTime || course.startTime;
        course.endTime = endTime || course.endTime;
      }

      const updatedCourse = await course.save();
      return res.json({
        status: 200,
        message: "Course updated successfully",
        data: updatedCourse,
      });
    } catch (error) {
      console.error("Error updating course:", error.message);
      return res.json({
        status: 500,
        message: "Failed to update course",
      });
    }
  });
};

const unlinkFile = util.promisify(fs.unlink);

const deleteCourse = async (req, res) => {
  try {
    const courseId = req.params.id;

    const videos = await Video.find({ courseId });
    for (const video of videos) {
      if (video.thumbnail) {
        const thumbnailPath = path.join(
          __dirname,
          "../public/thumbnails",
          video.thumbnail
        );
        try {
          await unlinkFile(thumbnailPath);
        } catch (err) {
          console.error(
            `Failed to delete thumbnail at ${thumbnailPath}:`,
            err.message
          );
        }
      }

      if (video.videofile) {
        const videoPath = path.join(
          __dirname,
          "../public/videos",
          video.videofile
        );
        try {
          await unlinkFile(videoPath);
        } catch (err) {
          console.error(
            `Failed to delete video file at ${videoPath}:`,
            err.message
          );
        }
      }

      await Video.findByIdAndDelete(video._id);
    }

    const deletedCourse = await Course.findByIdAndDelete(courseId);
    if (!deletedCourse) {
      return res.json({
        status: 404,
        error: "Course not found",
      });
    }

    await Order.deleteMany({ courseId });

    res.json({
      status: 200,
      message: "Course and associated videos deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting course:", error);
    res.json({
      status: 500,
      error: "Failed to delete course",
    });
  }
};

const courseCheckout = async (req, res) => {
  await Promise.all([
    body("courseId")
      .notEmpty()
      .withMessage("Course ID is required")
      .custom((value) => mongoose.Types.ObjectId.isValid(value))
      .withMessage("Invalid Course ID")
      .run(req),

    body("userId")
      .notEmpty()
      .withMessage("User ID is required")
      .custom((value) => mongoose.Types.ObjectId.isValid(value))
      .withMessage("Invalid User ID")
      .run(req),
  ]);

  const validationErrorObj = validationResult(req);
  if (!validationErrorObj.isEmpty()) {
    return res.status(400).json({
      status: 400,
      message: validationErrorObj.errors[0].msg,
    });
  }

  const { courseId, userId } = req.body;

  try {
    const course = await Course.findById(courseId);
    const user = await userModel.findById(userId);

    if (!course) {
      return res.json({
        status: 404,
        message: "Course not found",
      });
    }

    if (!user) {
      return res.json({
        status: 404,
        message: "User not found",
      });
    }

    if (!course.adminId) {
      return res.json({
        status: 400,
        message: "Course has no adminId assigned",
      });
    }

    const existingEnrollment = await Enrollment.findOne({
      courseId: courseId,
      userId: userId,
    });

    if (existingEnrollment) {
      return res.json({
        status: 400,
        message: "User already enrolled in this course",
      });
    }

    const EnrollCourse = new Enrollment({
      courseId: courseId,
      userId: userId,
      enrolledAt: new Date(),
    });

    await EnrollCourse.save();

    return res.json({
      status: 201,
      message: "Enrollment successful",
      data: EnrollCourse,
    });
  } catch (error) {
    console.error("Server error:", error.message);
    return res.status(500).json({
      status: 500,
      message: "Server error",
      error: error.message,
    });
  }
};

const coursetoggleButton = async (req, res) => {
  console.log(`PATCH request received for course ID: ${req.params.id}`);
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.json({
        status: 404,
        message: "Course not found",
      });
    }
    course.active = !course.active;
    await course.save();
    res.json({
      status: 200,
      course,
    });
  } catch (error) {
    console.error("Error toggling course:", error);
    res.json({
      status: 500,
      message: "Server error",
    });
  }
};

const getdashboard = async (req, res) => {
  try {
    const totalCourses = await Course.countDocuments();

    const activeCourses = await Course.countDocuments({ active: true });

    const totalVideos = await Video.countDocuments();

    res.status(200).json({
      totalCourses,
      activeCourses,
      totalVideos,
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  createCourse,
  getAllCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  courseCheckout,
  coursetoggleButton,
  getdashboard,
};
