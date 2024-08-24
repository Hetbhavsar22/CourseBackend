const upload = require("../../middleware/upload");
const Video = require("../../Model/videoModel");
const Course = require("../../Model/courseModel");
const adminModel = require("../../Model/adminModel");
const path = require("path");
const fs = require("fs");
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath('\ffmpeg\bin'); 
// Replace with the path to your ffmpeg binary
const util = require("util");
const { body, validationResult } = require("express-validator");
const { Console } = require("console");

const createVideo = (req, res) => {
  
  upload(req, res, async (err) => {
    if (err) {
      console.error("Error uploading file:", err.message);
      return res.json({
        status: 400,
        message: err.message,
      });
    }

    try {
      // Validation
      await Promise.all([
        body("title")
          .notEmpty()
          .withMessage("Title is required")
          .isLength({ min: 1, max: 50 })
          .withMessage("Video title must be between 1 and 50 characters long")
          .run(req),
        body("description")
          .notEmpty()
          .withMessage("Description is required")
          .isLength({ min: 1, max: 500 })
          .withMessage("Description must be between 1 and 500 characters long")
          .run(req),
        body("typev")
          .notEmpty()
          .withMessage("Type is required")
          .isIn(["video", "document"])
          .withMessage("Invalid type")
          .run(req),
        body("courseId")
          .notEmpty()
          .withMessage("Course ID is required")
          .run(req),
        body("createdBy")
          .notEmpty()
          .withMessage("CreatedBy is required")
          .run(req),
      ]);

      const validationErrorObj = validationResult(req);
      if (!validationErrorObj.isEmpty()) {
        return res.json({
          status: 401,
          message: validationErrorObj.errors[0].msg,
        });
      }

      const { title, description, tags, dvideo, typev, courseId, createdBy } =
        req.body;

      console.log("request Body: ", req.body);

      if (!createdBy || !courseId || !typev) {
        return res.status(400).json({ error: "Required fields are missing" });
      }

      const demoStatus =
        dvideo === "true" ? "Use as a Demo Video" : "No demo video";

      // Check if the course exists
      const course = await Course.findById(courseId);
      if (!course) {
        return res.json({
          status: 404,
          message: "Course not found",
        });
      }

      const newMedia = {
        adminId: createdBy,
        courseId,
        title,
        description,
        tags,
        typev,
        active: true,
      };

      if (typev === "document") {
        newMedia.pdf = req.files["pdf"] ? req.files["pdf"][0].path : undefined;
        newMedia.ppt = req.files["ppt"] ? req.files["ppt"][0].path : undefined;
        newMedia.doc = req.files["doc"] ? req.files["doc"][0].path : undefined;
      }

      if (typev === "video") {
        newMedia.dvideo = demoStatus;
        newMedia.thumbnail = req.files["thumbnail"]
          ? req.files["thumbnail"][0].path
          : undefined;
        newMedia.videofile = req.files["videofile"]
          ? req.files["videofile"][0].path
          : undefined;

        // Generate DASH manifest using FFmpeg
        if (newMedia.videofile) {
          const videoFilePath = newMedia.videofile;
          const outputDir = path.join(
            __dirname,
            "../../public/videos",
            courseId
          );

          // Ensure output directory exists
          if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
          }

          const manifestPath = path.join(outputDir, "manifest.mpd");

          await new Promise((resolve, reject) => {
            ffmpeg(videoFilePath)
              .output(manifestPath)
              .outputOptions([
                "-map 0",
                "-use_timeline 1",
                "-use_template 1",
                "-init_seg_name init_$RepresentationID$.mp4",
                "-media_seg_name chunk_$RepresentationID$_$Number$.m4s",
                "-f dash",
              ])
              .on("end", resolve)
              .on("error", reject)
              .run();
          });

          const manifestUrl = `${process.env.BASE_URL}/videos/${courseId}/manifest.mpd`;
          newMedia.manifestUrl = manifestUrl;
        }
      }

      const newVideo = new Video(newMedia);

      newVideo.save().then((savedVideo) =>
        res.json({
          status: 201,
          message: "Media uploaded successfully",
          video: savedVideo,
        })
      );
    } catch (error) {
      console.error("Error creating video:", error.message);
      return res.json({
        status: 500,
        message: "Failed to create video",
      });
    }
  });
};

// Controller to get all videos
const getAllVideos = async (req, res) => {
  try {
    const {
      search,
      page = 1,
      limit = 4,
      sortBy = "title",
      order = "asc",
    } = req.query;
    const query = {};
    if (search) {
      query.title = new RegExp(search, "i");
    }

    // Calculate the total number of courses that match the query
    const totalVideo = await Video.countDocuments(query);

    // Calculate the total number of pages
    const pageCount = Math.ceil(totalVideo / limit);

    // Fetch the videos for the current page
    const videos = await Video.find(query)
      .sort({ [sortBy]: order === "asc" ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    // Fetch course details for each video
    const videoData = await Promise.all(
      videos.map(async (video) => {
        const course = await Course.findById(video.courseId);
        const admin = await adminModel.findById(video.adminId);
        const updatedByAdmin = await adminModel.findById(video.updatedBy);

        return {
          ...video.toObject(),
          course: course ? course.cname : null,
          admin: admin ? admin.name : null,
          updatedBy: updatedByAdmin ? updatedByAdmin.name : null,
        };
      })
    );

    res.json({
      status: 200,
      videoData: Array.isArray(videoData) ? videoData : [],
      page: parseInt(page),
      pageCount,
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

const getVideosByCourse = async (req, res) => {
  // Validation for request body
  await body("courseId")
    .notEmpty()
    .withMessage("courseId is required")
    .isMongoId()
    .withMessage("Invalid course ID format")
    .run(req);

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.json({
      status: 400,
      message: errors.errors[0].msg,
    });
  }

  try {
    const { courseId } = req.body;

    // Fetch videos for the given course ID and sort them by order
    const videos = await Video.find({ courseId }).sort({ order: 1 });

    // Check if videos are found
    if (!videos.length) {
      return res.json({
        status: 404,
        message: "No videos found for this course",
      });
    }

    // Send the fetched videos as a response
    res.json({
      status: 200,
      videos,
    });
  } catch (err) {
    console.error("Server error:", err.message);
    res.json({
      status: 500,
      message: "Server error",
      error: err.message,
    });
  }
};

const updateVideoDetails = (req, res) => {
  console.log("start1");
  upload(req, res, async (err) => {
    if (err) {
      console.error("Error uploading file:", err.message);
      return res.json({
        status: 400,
        message: err.message,
      });
    }

    console.log("Start2");

    // Validation
    await Promise.all([
      body("title")
        .notEmpty()
        .withMessage("Title should be a non-empty string")
        .isLength({ min: 1, max: 50 })
        .withMessage("Video title must be between 1 and 50 characters long")
        .run(req),
      body("description")
        .notEmpty()
        .withMessage("Description should be a non-empty string")
        .isLength({ min: 1, max: 500 })
        .withMessage("Description must be between 1 and 500 characters long")
        .run(req),
      body("typev")
        .optional()
        .notEmpty()
        .withMessage("Type is required")
        .isIn(["video", "document"])
        .withMessage("Invalid type")
        .run(req),
      body("courseId")
        .optional()
        .notEmpty()
        .withMessage("Course ID is required")
        .custom((value) => mongoose.Types.ObjectId.isValid(value))
        .withMessage("Invalid Course ID")
        .run(req),
      body("createdBy")
        .optional()
        .notEmpty()
        .withMessage("CreatedBy is required")
        .custom((value) => mongoose.Types.ObjectId.isValid(value))
        .withMessage("Invalid CreatedBy ID")
        .run(req),
    ]);

    // Extract video ID from the request parameters
    const videoId = req.params.id;
    if (!videoId) {
      return res.json({
        status: 400,
        message: "Video ID is required",
      });
    }

    // Extract updated fields from the request body
    const { title, description, dvideo, tags, typev, courseId, createdBy } =
      req.body;

    if (!createdBy || !courseId || !typev) {
      return res.json({
        status: 400,
        message: "Required fields are missing",
      });
    }

    try {
      // Find the video document by ID
      const video = await Video.findById(videoId);
      if (!video) {
        return res.json({
          status: 404,
          message: "Video not found",
        });
      }

      const demoStatus =
        dvideo === "true" ? "Use as a Demo Video" : "No demo video";

      // Update the video document with new data
      video.title = title || video.title;
      video.description = description || video.description;
      video.dvideo = demoStatus || video.dvideo;
      video.tags = tags || video.tags;
      video.typev = typev || video.typev;
      video.courseId = courseId || video.courseId;
      video.adminId = createdBy || video.adminId;

      // Handle file updates based on typev
      if (typev === "document") {
        video.dvideo = null;
        video.thumbnail = null;
        video.videofile = null;
        if (req.files["pdf"]) {
          video.pdf = req.files["pdf"][0].path;
        }
        if (req.files["ppt"]) {
          video.ppt = req.files["ppt"][0].path;
        }
        if (req.files["doc"]) {
          video.doc = req.files["doc"][0].path;
        }
        if (!req.files["pdf"] && !req.files["ppt"] && !req.files["doc"]) {
          return res.status(400).json({
            status: 400,
            message:
              "Document type requires at least one document file (pdf, ppt, doc)",
          });
        }
      }

      if (typev === "video") {
        video.pdf = null;
        video.ppt = null;
        video.doc = null;
        video.dvideo = demoStatus;
        if (req.files["thumbnail"]) {
          video.thumbnail = req.files["thumbnail"][0].path;
        } else {
          return re.json({
            status: 400,
            message: "Video type requires a thumbnail file",
          });
        }
        if (req.files["videofile"]) {
          video.videofile = req.files["videofile"][0].path;
        } else {
          return res.json({
            status: 400,
            message: "Video type requires a video file",
          });
        }
      }

      console.log("Updated Video Object:", video);

      // Save the updated video document
      const updatedVideo = await video.save();
      res.json({
        status: 200,
        message: "Video updated successfully",
        video: updatedVideo,
      });
    } catch (err) {
      console.error("Database update error:", err.message);
      res.json({
        status: 500,
        message: "Failed to update video",
        error: err.message,
      });
    }
  });
};

// Convert fs.unlink to a promise-based function
const unlinkFile = util.promisify(fs.unlink);
const deleteVideo = async (req, res) => {
  const videoId = req.params.id;

  if (!videoId) {
    return res.json({
      status: 400,
      error: "Video ID is required",
    });
  }

  try {
    // Find the video document by ID
    const video = await Video.findById(videoId);
    if (!video) {
      return res.json({
        status: 404,
        error: "Video not found",
      });
    }

    // Delete associated files if they exist
    if (video.thumbnail) {
      const thumbnailPath = path.join(
        __dirname,
        "../public/thumbnails",
        video.thumbnail
      );
      await unlinkFile(thumbnailPath);
    }

    if (video.videofile) {
      const videoPath = path.join(
        __dirname,
        "../public/videos",
        video.videofile
      );
      await unlinkFile(videoPath);
    }

    // Delete the video document
    await Video.findByIdAndDelete(videoId);

    res.json({ message: "Video deleted successfully" });
  } catch (err) {
    console.error("Error deleting video:", err.message);
    res.json({
      status: 500,
      error: "Failed to delete video",
    });
  }
};

const updateVideoOrder = async (req, res) => {
  const { videos } = req.body; // Array with updated order

  try {
    for (const video of videos) {
      await Video.updateOne(
        { _id: video._id },
        { $set: { order: video.order } }
      );
    }
    res.send({ status: 200 }, "Video order updated successfully");
  } catch (error) {
    console.error(error);
    res.send({ status: 500 }, "Error updating video order");
  }
};

const videotoggleButton = async (req, res) => {
  console.log(`PATCH request received for video ID: ${req.params.id}`);
  try {
    const video = await Video.findById(req.params.id);
    if (!video) {
      return res.json({
        status: 404,
        message: "Video not found",
      });
    }
    video.active = !video.active;
    await video.save();
    res.json({
      status: 200,
      video,
    });
  } catch (error) {
    console.error(
      "Error toggling video:",
      error.response ? error.response.data : error.message
    );
    res.json({
      status: 500,
      message: "Server error",
    });
  }
};

module.exports = {
  createVideo,
  getAllVideos,
  getVideosByCourse,
  updateVideoDetails,
  deleteVideo,
  updateVideoOrder,
  videotoggleButton,
};
