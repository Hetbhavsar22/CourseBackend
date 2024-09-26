const mongoose = require("mongoose");
const Course = require("../../Model/courseModel");
const Video = require("../../Model/videoModel");
const userModel = require("../../Model/userModel");
const adminModel = require("../../Model/adminModel");
const Enrollment = require("../../Model/enrollmentModel");
const Order = require("../../Model/oder_IdModel");
const Purchase = require("../../Model/coursePurchaseModel");
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
          .isInt({ min: 1 }) // Ensure at least 1 video
          .withMessage("Total video count must be a positive integer")
          .run(req),
        body("hours")
          .notEmpty()
          .withMessage("Total hours are required")
          .isFloat({ min: 1 }) // Ensure at least 1 hour
          .withMessage("Hours must be a positive number")
          .run(req),
        body("author")
          .notEmpty()
          .withMessage("Author name is required")
          .isLength({ min: 1, max: 50 })
          .withMessage("Author name must be between 1 and 50 characters long")
          .custom((value) => {
            const specialCharRegex = /[^a-zA-Z0-9\s]/;
            if (specialCharRegex.test(value)) {
              throw new Error(
                "Author name should not contain special characters."
              );
            }
            return true;
          })
          .run(req),
        body("shortDescription")
          .notEmpty()
          .withMessage("Short description is required")
          .isLength({ min: 1, max: 400 })
          .withMessage("Description must be between 1 and 400 characters long")
          .run(req),
        body("longDescription")
          .notEmpty()
          .withMessage("Long description is required")
          .run(req),
        body("language")
          .notEmpty()
          .withMessage("Language is required")
          .run(req),
        body("price")
          .notEmpty()
          .withMessage("Price is required")
          .isFloat({ min: 0 }) // Ensure price is non-negative
          .withMessage("Price must be a positive number")
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
          .isFloat({ min: 0 }) // Ensure display price is non-negative
          .withMessage("Display Price must be a positive number")
          .run(req),
        body("courseGst")
          .notEmpty()
          .withMessage("Course GST is required")
          .isFloat({ min: 0, max: 100 }) // Ensure GST is between 0 and 100
          .withMessage("GST must be between 0 and 100.")
          .run(req),
        body("chapters")
          .optional()
          .isArray()
          .withMessage("Chapters must be an array")
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
        author,
        shortDescription,
        longDescription,
        language,
        price,
        dprice,
        chapters,
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

      const demoVideofile =
        req.files && req.files.demoVideofile
          ? req.files.demoVideofile[0].path
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
        demoVideofile,
        hours,
        author,
        shortDescription,
        longDescription,
        language,
        price: finalPrice,
        dprice: finalDprice,
        chapters: chapters.map((chapter, index) => ({
          number: index + 1,
          name: chapter,
        })),
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
      userId,
      cname,
      price,
      dprice,
      courseGst,
      totalVideo,
      hours,
      author,
      language,
      courseType,
      percentage,
      createdBy,
      createdAt,
    } = req.query;

    // Initialize query object
    const query = {};

    // If 'search' is present, apply a general search across multiple fields
    if (search) {
      query.$or = [
        { cname: new RegExp(search, "i") },
        { author: new RegExp(search, "i") },
        { language: new RegExp(search, "i") },
        { courseType: new RegExp(search, "i") },
      ];
    }

    // Additional field-specific filters
    if (cname) {
      query.cname = new RegExp(cname, "i");
    }
    if (price) {
      query.price = price; // Assuming exact match; use ranges if needed
    }
    if (dprice) {
      query.dprice = dprice;
    }
    if (courseGst) {
      query.courseGst = courseGst;
    }
    if (totalVideo) {
      query.totalVideo = totalVideo;
    }
    if (hours) {
      query.hours = hours;
    }
    if (author) {
      query.author = new RegExp(author, "i");
    }
    if (language) {
      query.language = new RegExp(language, "i");
    }
    if (courseType) {
      query.courseType = new RegExp(courseType, "i");
    }
    if (percentage) {
      query.percentage = percentage;
    }
    if (createdBy) {
      query.createdBy = createdBy;
    }
    if (createdAt) {
      const createdAtDate = new Date(createdAt);
      query.createdAt = {
        $gte: createdAtDate.setHours(0, 0, 0, 0),
        $lt: createdAtDate.setHours(23, 59, 59, 999),
      };
    }

    const sortOrder = order.toLowerCase() === "asc" ? 1 : -1;


    // Pagination and Sorting
    const totalCourses = await Course.countDocuments(query);
    const pageCount = Math.ceil(totalCourses / limit);

    // Fetch courses with sorting and pagination
    const courses = await Course.find(query)
      .sort({ [sortBy]: sortOrder })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    // Check if `userId` is provided to determine enrollment status
    if (userId) {
      const enrollments = await Enrollment.find({ userId });
      const enrolledCourseIds = enrollments.map((enrollment) =>
        enrollment.courseId.toString()
      );

      // Add enrollment status to each course
      const coursesWithEnrollmentStatus = courses.map((course) => ({
        _id: course._id,
        cname: course.cname,
        totalVideo: course.totalVideo,
        courseImage: course.courseImage,
        shortDescription: course.shortDescription,
        hours: course.hours,
        language: course.language,
        author: course.author,
        price: course.price,
        dprice: course.dprice,
        isEnrolled: enrolledCourseIds.includes(course._id.toString()),
      }));

      return res.json({
        courses: coursesWithEnrollmentStatus,
        page: parseInt(page),
        pageCount,
        totalCourses,
      });
    }

    // Return course data if userId is not provided
    res.json({
      courses,
      page: parseInt(page),
      pageCount,
      totalCourses,
    });
  } catch (error) {
    console.error("Error fetching courses:", error);
    res.status(500).json({
      message: error.message,
    });
  }
};


const getCourseById = async (req, res) => {
  try {
    // await param("id")
    //   .notEmpty()
    //   .withMessage("Course ID is required")
    //   .custom((value) => mongoose.Types.ObjectId.isValid(value))
    //   .withMessage("Invalid course ID")
    //   .run(req);

    const validationErrorObj = validationResult(req);
    if (!validationErrorObj.isEmpty()) {
      return res.json({
        status: 401,
        message: validationErrorObj.errors[0].msg,
      });
    }

    const { id } = req.params;
    const userId = req.body.userId;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.json({
        status: 400,
        message: "Invalid course ID",
      });
    }

    const course = await Course.findById(id);
    if (!course) {
      return res.json({
        status: 404,
        message: "Course not found",
      });
    }

    if (!userId) {
      return res.json({
        status: 404,
        message: "User not found",
      });
    }

    // Check if user is enrolled in the course
    let isEnrolled = false;
    if (userId) {
      const enrollment = await Enrollment.findOne({ userId, courseId: id });
      isEnrolled = !!enrollment; // Set to true if enrollment exists
    }

    return res.json({
      status: 200,
      data: {
        ...course._doc, // Spread the course details
        isEnrolled, // Include enrollment status
      },
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
        .withMessage("Total Videos cannot be empty")
        .isInt({ min: 1 }) // Ensure at least 1 video
        .withMessage("Total video count must be a positive integer")
        .run(req),

      body("hours")
        .notEmpty()
        .withMessage("Total Hours cannot be empty")
        .isFloat({ min: 1 }) // Ensure at least 1 hour
        .withMessage("Hours must be a positive number")
        .run(req),

      body("shortDescription")
        .notEmpty()
        .withMessage("Short description cannot be empty")
        .isLength({ max: 400 })
        .withMessage("Short description cannot exceed 400 characters")
        .run(req),

      body("longDescription")
        .optional()
        .notEmpty()
        .withMessage("Long description cannot be empty")
        .run(req),

      body("language")
        .notEmpty()
        .withMessage("Language cannot be empty")
        .isIn(["English", "Hindi", "Gujarati"])
        .withMessage("Invalid language")
        .run(req),

      body("price")
        .notEmpty()
        .withMessage("Price is required")
        .isFloat({ min: 0 }) // Ensure price is non-negative
        .withMessage("Price must be a positive number")
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
        .isFloat({ min: 0 }) // Ensure display price is non-negative
        .withMessage("Display Price must be a positive number")
        .run(req),

      body("courseGst")
        .notEmpty()
        .withMessage("Course GST is required")
        .isFloat({ min: 0, max: 100 }) // Ensure GST is between 0 and 100
        .withMessage("GST must be between 0 and 100.")
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

    // const { courseId } = req.params;
    const {
      courseId,
      cname,
      totalVideo,
      hours,
      author,
      shortDescription,
      longDescription,
      language,
      price,
      dprice,
      chapters,
      courseGst,
      courseType,
      percentage,
      startTime,
      endTime,
    } = req.body;

    if (!courseId) {
      return res.json({
        status: 400,
        message: "Course ID is required.",
      });
    }

    const courseImage =
      req.files && req.files.courseImage ? req.files.courseImage[0].path : null;

    const demoVideofile =
      req.files && req.files.demoVideofile
        ? req.files.demoVideofile[0].path
        : null;

    try {
      const course = await Course.findById(courseId);
      if (!course) {
        return res.json({
          status: 404,
          message: "Course not found",
        });
      }

      // Check if a course with the same name exists (other than the current course)
      const existingCourse = await Course.findOne({
        cname,
        _id: { $ne: courseId },
      });
      if (existingCourse) {
        return res.json({
          status: 401,
          message: "Course with the same details already exists",
        });
      }

      const finalPrice = price === "0" ? "Free" : price;
      const finalDprice = dprice === "0" ? "Free" : dprice;

      // Update course fields
      course.cname = cname || course.cname;
      course.totalVideo = totalVideo || course.totalVideo;
      course.courseImage = courseImage || course.courseImage;
      course.demoVideofile = demoVideofile || course.demoVideofile;
      course.hours = hours || course.hours;
      course.author = author || course.author;
      course.shortDescription = shortDescription || course.shortDescription;
      course.longDescription = longDescription || course.longDescription;
      course.language = language || course.language;
      course.price = finalPrice || course.price;
      course.dprice = finalDprice || course.dprice;

      // Handling chapters
      if (chapters) {
        course.chapters = chapters.map((chapter, index) => ({
          number: index + 1,
          name: chapter,
        }));
      }

      // Handle courseType specific fields
      course.courseGst = courseGst || course.courseGst;
      course.courseType = courseType || course.courseType;
      if (courseType === "percentage") {
        course.percentage = percentage || course.percentage;
        course.startTime = null; // Reset time-specific fields when type is percentage
        course.endTime = null;
      } else if (courseType === "timeIntervals") {
        course.startTime = startTime || course.startTime;
        course.endTime = endTime || course.endTime;
        course.percentage = null; // Reset percentage when type is timeIntervals
      }

      // Save updated course
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

// const unlinkFile = util.promisify(fs.unlink);

// const deleteCourse = async (req, res) => {
//   try {
//     const courseId = req.params.id;

//     const videos = await Video.find({ courseId });
//     for (const video of videos) {
//       if (video.thumbnail) {
//         const thumbnailPath = path.join(
//           __dirname,
//           "../public/thumbnails",
//           video.thumbnail
//         );
//         try {
//           await unlinkFile(thumbnailPath);
//         } catch (err) {
//           console.error(
//             `Failed to delete thumbnail at ${thumbnailPath}:`,
//             err.message
//           );
//         }
//       }

//       if (video.videofile) {
//         const videoPath = path.join(
//           __dirname,
//           "../public/videos",
//           video.videofile
//         );
//         try {
//           await unlinkFile(videoPath);
//         } catch (err) {
//           console.error(
//             `Failed to delete video file at ${videoPath}:`,
//             err.message
//           );
//         }
//       }

//       await Video.findByIdAndDelete(video._id);
//     }

//     const deletedCourse = await Course.findByIdAndDelete(courseId);
//     if (!deletedCourse) {
//       return res.json({
//         status: 404,
//         error: "Course not found",
//       });
//     }

//     await Order.deleteMany({ courseId });

//     res.json({
//       status: 200,
//       message: "Course and associated videos deleted successfully",
//     });
//   } catch (error) {
//     console.error("Error deleting course:", error);
//     res.json({
//       status: 500,
//       error: "Failed to delete course",
//     });
//   }
// };

const unlinkFile = util.promisify(fs.unlink);
const rmdir = util.promisify(fs.rmdir); // For deleting folders
const fsPromises = fs.promises;

const deleteCourse = async (req, res) => {
  try {
    const courseId = req.params.id;

    // Find all videos associated with the course
    const videos = await Video.find({ courseId });
    const basePath = path.join(__dirname, "../../public");

    for (const video of videos) {
      // Delete the thumbnail if it exists
      if (video.thumbnail) {
        const thumbnailPath = path.join(__dirname, "../../", video.thumbnail);
        if (fs.existsSync(thumbnailPath)) {
          await unlinkFile(thumbnailPath);
          console.log(`Thumbnail deleted: ${thumbnailPath}`);
        } else {
          console.log(`Thumbnail not found at path: ${thumbnailPath}`);
        }
      }

      // Delete the video file if it exists
      if (video.videofile) {
        const videoUrl = new URL(video.videofile);
        const videoPath = path.join(
          __dirname,
          "../../public",
          videoUrl.pathname.replace("/public/", "")
        );
        if (fs.existsSync(videoPath)) {
          await unlinkFile(videoPath);
          console.log(`Video file deleted: ${videoPath}`);
        } else {
          console.log(`Video file not found at path: ${videoPath}`);
        }
      }

      // Delete the PDF file if it exists
      if (video.pdf) {
        const pdfPath = path.join(__dirname, "../../", video.pdf);
        if (fs.existsSync(pdfPath)) {
          await unlinkFile(pdfPath);
          console.log(`PDF file deleted: ${pdfPath}`);
        } else {
          console.log(`PDF file not found at path: ${pdfPath}`);
        }
      }

      // Delete the PPT file if it exists
      if (video.ppt) {
        const pptPath = path.join(__dirname, "../../", video.ppt);
        if (fs.existsSync(pptPath)) {
          await unlinkFile(pptPath);
          console.log(`PPT file deleted: ${pptPath}`);
        } else {
          console.log(`PPT file not found at path: ${pptPath}`);
        }
      }

      // Delete the document file if it exists
      if (video.doc) {
        const documentPath = path.join(__dirname, "../../", video.doc);
        if (fs.existsSync(documentPath)) {
          await unlinkFile(documentPath);
          console.log(`Document file deleted: ${documentPath}`);
        } else {
          console.log(`Document file not found at path: ${documentPath}`);
        }
      }

      // Finally, delete the video record itself
      await Video.findByIdAndDelete(video._id);
    }

    // Delete the course document from the database
    const deletedCourse = await Course.findByIdAndDelete(courseId);
    if (!deletedCourse) {
      return res.status(404).json({
        status: 404,
        error: "Course not found",
      });
    }

    // Delete all orders associated with the course
    await Order.deleteMany({ courseId });

    // If all associated videos are deleted, delete the course's folder in the videos directory
    const courseVideoFolder = path.join(basePath, "videos", courseId); // Assuming the folder is named after courseId
    if (fs.existsSync(courseVideoFolder)) {
      const files = await fsPromises.readdir(courseVideoFolder);
      if (files.length === 0) {
        await rmdir(courseVideoFolder);
        console.log(`Course video folder deleted: ${courseVideoFolder}`);
      } else {
        console.log(`Course video folder not empty, remaining files: ${files}`);
      }
    } else {
      console.log(`Course video folder not found: ${courseVideoFolder}`);
    }

    res.json({
      status: 200,
      message: "Course, associated videos, and files deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting course:", error);
    res.status(500).json({
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
    const currentDate = new Date(); // Get the current Date
    const past30Days = new Date(currentDate); // Clone the current Date
    past30Days.setDate(currentDate.getDate() - 30); // Set it to 30 days ago

    const totalCourses = await Course.countDocuments();

    const activeCourses = await Course.countDocuments({ active: true });

    const totalVideos = await Video.countDocuments();

    const activeVideos = await Video.countDocuments({ active: true });

    const totalUsers = await userModel.countDocuments();

    const activeUsers = await userModel.countDocuments({ active: true });

    const totalSales = await Enrollment.countDocuments();

    // const oneMonthSales = await Enrollment.countDocuments({});
    const oneMonthSales = await Purchase.countDocuments({
      transactionDate: { $gte: past30Days }, // Assuming 'createdAt' is the field tracking when the enrollment was made
    });

    res.status(200).json({
      totalCourses,
      activeCourses,
      totalVideos,
      activeVideos,
      totalUsers,
      activeUsers,
      totalSales,
      oneMonthSales,
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
