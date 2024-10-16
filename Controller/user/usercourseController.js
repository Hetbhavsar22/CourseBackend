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

const getAllCourses = async (req, res) => {
  try {
    const {
      search,
      page,
      limit,
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
      active,
    } = req.query;

    const query = {};

    if (active) {
      query.active = active === "true";
    }

    if (search) {
      query.$or = [
        { cname: new RegExp(search, "i") },
        { author: new RegExp(search, "i") },
        { language: new RegExp(search, "i") },
        { courseType: new RegExp(search, "i") },
      ];
    }

    if (cname) {
      query.cname = new RegExp(cname, "i");
    }
    if (price) {
      query.price = price;
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

    const totalCourses = await Course.countDocuments(query);

    const courses = await Course.find(query)
      .sort({ [sortBy]: sortOrder })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    if (userId) {
      const enrollments = await Enrollment.find({ userId });
      const enrolledCourseIds = enrollments.map((enrollment) =>
        enrollment.courseId.toString()
      );
      const coursesWithEnrollmentStatus = await Promise.all(
        courses.map(async (course) => {
          const resources = await Video.find({ courseId: course._id });
          if (resources.length > 0) {
            return {
              _id: course._id,
              cname: course.cname,
              totalVideo: course.totalVideo,
              courseImage: course.courseImage,
              shortDescription: course.shortDescription,
              dvideo: course.demoVideofile,
              hours: course.hours,
              language: course.language,
              author: course.author,
              price: course.price,
              dprice: course.dprice,
              isEnrolled: enrolledCourseIds.includes(course._id.toString()),
            };
          }
          return null;
        })
      );

      const filteredCoursesWithEnrollmentStatus =
        coursesWithEnrollmentStatus.filter((course) => course !== null);

      return res.json({
        courses: filteredCoursesWithEnrollmentStatus,
        page: parseInt(page),
        pageCount,
        totalCourses,
      });
    }

    const filteredCourses = await Promise.all(
      courses.map(async (course) => {
        const resources = await Video.find({ courseId: course._id });
        if (resources.length > 0) {
          return course;
        }
        return null;
      })
    );

    const validCourses = filteredCourses.filter((course) => course !== null);

    res.json({
      courses: validCourses,
      totalCourses,
    });
  } catch (error) {
    console.error("Error fetching courses:", error);
    res.status(500).json({
      message: error.message,
    });
  }
};

const getAllVideos = async (req, res) => {
  try {
    const {
      search,
      page,
      limit,
      sortBy = "order",
      order = "asc",
      courseId,
      author,
      active,
    } = req.query;

    const query = {};

    if (active) {
      query.active = active === "true";
    }

    let courseIds = [];

    if (search) {
      const regex = new RegExp(search, "i");

      query["$or"] = [{ title: regex }];

      const courses = await Course.find({ cname: regex }, "_id");

      if (courses.length) {
        courseIds = courses.map((course) => course._id);
        query["$or"].push({ courseId: { $in: courseIds } });
      }
      if (author) {
        query.author = new RegExp(author, "i");
      }
      if (courseId) {
        query.courseId = courseId;
      }
    }

    const sortOrder = order.toLowerCase() === "asc" ? 1 : -1;

    const totalVideo = await Video.countDocuments(query);

    const videos = await Video.find(query)
      .sort({ courseId: 1, [sortBy]: sortOrder })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate("courseId", "cname")
      .populate("adminId", "name")
      .populate("updatedBy", "name");

    res.json({
      status: 200,
      videos,
      totalVideo,
    });
  } catch (error) {
    console.error("Error fetching videos:", error);
    res.json({
      status: 500,
      error: "Failed to fetch videos",
    });
  }
};

module.exports = {
  getAllCourses,
  getAllVideos,
};
