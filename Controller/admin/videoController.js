const upload = require("../../middleware/upload");
const Video = require("../../Model/videoModel");
const Course = require("../../Model/courseModel");
const adminModel = require("../../Model/adminModel");
const path = require("path");
const fs = require("fs");
const ffmpeg = require("fluent-ffmpeg");
const { body, validationResult } = require("express-validator");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const VideoProgress = require("../../Model/VideoProgress");
const util = require("util");
const unlinkFile = util.promisify(fs.unlink);
const { exec } = require("child_process");

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
        body("type")
          .notEmpty()
          .withMessage("Type is required")
          .isIn(["video", "document"])
          .withMessage("Invalid type")
          .run(req),
        body("courseId")
          .notEmpty()
          .withMessage("Course ID is required")
          .run(req),
          body("chapter")
          .notEmpty()
          .withMessage("Chapter is required")
          .run(req),
          body("chapter")
          .notEmpty()
          .withMessage("Chapter is required")
          .run(req),
        // body("createdBy")
        //   .optional()
        //   .notEmpty()
        //   .withMessage("CreatedBy is required")
        //   .custom((value) => mongoose.Types.ObjectId.isValid(value))
        //   .withMessage("Invalid CreatedBy ID")
        //   .run(req),
      ]);

      const validationErrorObj = validationResult(req);
      if (!validationErrorObj.isEmpty()) {
        return res.json({
          status: 401,
          message: validationErrorObj.errors[0].msg,
        });
      }

      const { title, description, tags, type, courseId, chapter, videoURL } = req.body;

      console.log("request Body: ", req.body);

      if (!courseId || !type) {
        return res.status(400).json({ error: "Required fields are missing" });
      }

      // if (!videoURL && !req.files["videofile"]) {
      //   return res.status(400).json({ error: "Video URL or Video file is required." });
      // }

      // if (videoURL && req.files["videofile"]) {
      //   return res.status(400).json({ error: "Only one of Video URL or Video file can be provided." });
      // }

      // Check if the course exists
      const course = await Course.findById(courseId);
      if (!course) {
        return res.json({
          status: 404,
          message: "Course not found",
        });
      }

      const token = req.headers.authorization.split(" ")[1];
      const decodedToken = jwt.verify(token, process.env.SECRET_KEY);
      const adminId = decodedToken.id;

      const admin = await adminModel.findById(adminId);
      if (!admin || !mongoose.Types.ObjectId.isValid(adminId)) {
        return res.json({
          status: 401,
          message: "Admin not found",
        });
      }

      // Count the total videos for the course
      const totalVideos = await Video.countDocuments({ courseId });

      // Set the order to be -(totalVideos + 1) so that first video is -1, second is -2, and so on
      const newOrder = -(totalVideos + 1);

      console.log("videoURL: ", videoURL)
      const newMedia = {
        createdBy: admin.name,
        courseId,
        title,
        description,
        tags,
        type,
        active: true,
        order: newOrder, // Set the order as -1, -2, etc.
        chapter,
        videoURL,
      };

      if (type === "document") {
        newMedia.pdf = req.files["pdf"] ? req.files["pdf"][0].path : undefined;
        newMedia.ppt = req.files["ppt"] ? req.files["ppt"][0].path : undefined;
        newMedia.doc = req.files["doc"] ? req.files["doc"][0].path : undefined;
      }

      if (type === "video") {
        newMedia.thumbnail = req.files["thumbnail"]
          ? req.files["thumbnail"][0].path
          : undefined;
        newMedia.videofile = req.files["videofile"]
          ? req.files["videofile"][0].path
          : undefined;

        // Generate DASH manifest using FFmpeg
        if (newMedia.videofile) {
          const videoFilePath = newMedia.videofile;
          const videoFileName = path.basename(
            videoFilePath,
            path.extname(videoFilePath)
          );
          const outputDir = path.join(
            __dirname,
            "../../public/videos",
            courseId,
            chapter
          );

          // Ensure output directory exists
          if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
          }

          const manifestPath = path.join(outputDir, `${videoFileName}.mpd`);

console.log('videofilepath: ',videoFilePath)

          // await new Promise((resolve, reject) => {
          //   ffmpeg(videoFilePath)
          //     .output(manifestPath)
          //     .outputOptions([
          //       "-map 0",
          //       "-use_timeline 1",
          //       "-use_template 1",
          //       "-init_seg_name init_$RepresentationID$.mp4",
          //       "-media_seg_name chunk_$RepresentationID$_$Number$.m4s",
          //       "-f dash",
          //     ])
          //     .on("end", resolve)
          //     .on("error", reject)
          //     .run();
          // });

          await new Promise((resolve, reject) => {
            exec(
              `MP4Box -dash 1000 -frag 1000 -rap -profile live -out "${manifestPath}" "${videoFilePath}"`,
              (error, stdout, stderr) => {
                if (error) {
                  return reject(`Error generating DASH manifest: ${stderr}`);
                }
                resolve();
              }
            );
          });

          const manifestUrl = `${process.env.BASE_URL}/public/videos/${courseId}/${chapter}/${videoFileName}.mpd`;
          newMedia.videofile = manifestUrl;
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
      console.error("Error creating video:", error);
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
      sortBy = "order",
      order = "asc",
    } = req.query;

    // Set up query for video search
    const query = {};
    if (search) {
      query.title = new RegExp(search, "i");
    }

    // Pagination and Sorting
    const totalVideo = await Video.countDocuments(query);
    const pageCount = Math.ceil(totalVideo / limit);

    // Fetch videos with sorting and pagination
    const videos = await Video.find(query)
      .sort({ courseId: 1, [sortBy]: order === "asc" ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate("courseId", "cname") // Assuming 'courseId' refers to 'Course' model
      .populate("adminId", "name") // Assuming 'adminId' refers to 'Admin' model
      .populate("upDatedBy", "name"); // Assuming 'upDatedBy' refers to 'Admin' model

    res.json({
      status: 200,
      videos,
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
  // await body("courseId")
  //   .notEmpty()
  //   .withMessage("courseId is required")
  //   .isMongoId()
  //   .withMessage("Invalid course ID format")
  //   .run(req);

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.json({
      status: 400,
      message: errors.errors[0].msg,
    });
  }

  const { courseId } = req.params;
  const totalVideo = await Video.countDocuments({ courseId });
  // const { page = 1, limit=totalVideo, search = "", sortBy = "order", order = "asc" } = req.query;
  const { search = "", sortBy = "order", order = "asc" } = req.query;
  if (!courseId) {
    return res.status(400).json({
      status: 400,
      message: "courseId is required",
    });
  }

  try {
    const course = await Course.findById(courseId).select("cname");

    if (!course) {
      return res.status(404).json({
        status: 404,
        message: "Course not found",
      });
    }

    // Fetch videos with pagination, filtering, and sorting
    const videos = await Video.find({
      courseId,
      title: { $regex: search, $options: "i" },
    }).sort({ [sortBy]: order });
    // .skip((page - 1) * limit)
    // .limit(parseInt(limit));

    // Check if videos are found
    if (!videos.length) {
      return res.json({
        status: 404,
        message: "No videos found for this course",
      });
    }

    // Send the fetched videos, total count, and page count as response
    res.json({
      status: 200,
      courseName: course.cname,
      videos,
      totalVideo,
      // pageCount: Math.ceil(totalVideo / limit),
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

const upDateVideoDetails = (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      console.error("Error uploading file:", err.message);
      return res.json({
        status: 400,
        message: err.message,
      });
    }

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
      body("type")
        .optional()
        .notEmpty()
        .withMessage("Type is required")
        .isIn(["video", "document"])
        .withMessage("Invalid type")
        .run(req),
        body("chapter")
        .notEmpty()
        .withMessage("Chapter is required")
        .run(req),
      // body("courseId")
      //   .optional()
      //   .notEmpty()
      //   .withMessage("Course ID is required")
      //   .custom((value) => mongoose.Types.ObjectId.isValid(value))
      //   .withMessage("Invalid Course ID")
      //   .run(req),
      // body("createdBy")
      //   .optional()
      //   .notEmpty()
      //   .withMessage("CreatedBy is required")
      //   .custom((value) => mongoose.Types.ObjectId.isValid(value))
      //   .withMessage("Invalid CreatedBy ID")
      //   .run(req),
    ]);

    // Extract video ID from the request parameters
    const videoId = req.params.id;
    if (!videoId) {
      return res.json({
        status: 400,
        message: "Video ID is required",
      });
    }

    // Extract upDated fields from the request body
    const { title, description, tags, type, courseId, chapter } = req.body;

    if (!courseId || !type) {
      return res.json({
        status: 400,
        message: "Required fields are missing",
      });
    }

    console.log("courseId: ", courseId)

    try {
      // Find the video document by ID
      const video = await Video.findById(videoId);
      if (!video) {
        return res.json({
          status: 404,
          message: "Video not found",
        });
      }

      const token = req.headers.authorization.split(" ")[1];
      const decodedToken = jwt.verify(token, process.env.SECRET_KEY);
      const adminId = decodedToken.id;
      const admin = await adminModel.findById(adminId);
      if (!admin || !mongoose.Types.ObjectId.isValid(adminId)) {
        return res.json({
          status: 401,
          message: "Admin not found",
        });
      }
      const createdBy = admin.name;
      
      video.thumbnail = null;
      video.videofile = null;
      video.pdf = null;
      video.ppt = null;
      video.doc = null;

      // UpDate the video document with new data
      video.title = title || video.title;
      video.description = description || video.description;
      video.tags = tags || video.tags;
      video.type = type || video.type;
      video.chapter = chapter || video.chapter;
      video.courseId = courseId || video.courseId;
      video.createdBy = createdBy || video.createdBy;

      // Handle file upDates based on type
      if (type === "document") {
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

      if (type === "video") {
     

        if (req.files["thumbnail"]) {
          video.thumbnail = req.files["thumbnail"][0].path;
        } else {
          return res.json({
            status: 400,
            message: "Video type requires a thumbnail file",
          });
        }

        if (req.files["videofile"]) {
          video.videofile = req.files["videofile"][0].path;

          // Generate DASH manifest using FFmpeg
          if (video.videofile) {
            const videoFilePath = video.videofile;
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

            const manifestUrl = `${process.env.BASE_URL}/public/videos/${courseId}/manifest.mpd`;
            video.videofile = manifestUrl;
          }
        } else {
          return res.json({
            status: 400,
            message: "Video type requires a video file",
          });
        }
      }

      console.log("UpDated Video Object:", video);

      // Save the upDated video document
      const upDatedVideo = await video.save();
      res.json({
        status: 200,
        message: "Video upDated successfully",
        video: upDatedVideo,
      });
    } catch (err) {
      console.error("Database upDate error:", err.message);
      res.json({
        status: 500,
        message: "Failed to upDate video",
        error: err.message,
      });
    }
  });
};


const coursechapters = async (req, res) => {
  try {
    const { courseId } = req.params;
    const course = await Course.findById(courseId).populate("chapters");
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }
    res.json({ chapters: course.chapters });
  } catch (error) {
    console.error("Error fetching chapters:", error);
    res.status(500).json({ message: "Failed to fetch chapters" });
  }
};

const deleteVideo = async (req, res) => {
  const videoId = req.params.id;

  if (!videoId) {
    return res.status(400).json({
      status: 400,
      error: "Video ID is required",
    });
  }

  try {
    // Find the video document by ID
    const video = await Video.findById(videoId);
    if (!video) {
      return res.status(404).json({
        status: 404,
        error: "Video not found",
      });
    }

    // Delete associated thumbnail if it exists
    if (video.thumbnail) {
      const thumbnailPath = path.join(
        __dirname,
        "../../",
        video.thumbnail // Assuming 'video.thumbnail' stores 'thumbnails/filename.png'
      );
      if (fs.existsSync(thumbnailPath)) {
        await unlinkFile(thumbnailPath);
        console.log(`Thumbnail deleted: ${thumbnailPath}`);

        // Check if the file still exists
        if (!fs.existsSync(thumbnailPath)) {
          console.log("Thumbnail successfully deleted.");
        } else {
          console.log("Thumbnail still exists after deletion attempt.");
        }
      } else {
        console.log(`Thumbnail not found at path: ${thumbnailPath}`);
      }
    }

    // Delete associated video file if it exists
    if (video.videofile) {
      const videoUrl = new URL(video.videofile); // Parse the URL to get the file path
      const videoPath = path.join(
        __dirname,
        "../../public",
        videoUrl.pathname.replace("/public/", "") // Removing the /public/ part from the URL
      );
      if (fs.existsSync(videoPath)) {
        await unlinkFile(videoPath);
        console.log(`Video file deleted: ${videoPath}`);

        // Check if the file still exists
        if (!fs.existsSync(videoPath)) {
          console.log("Video file successfully deleted.");
        } else {
          console.log("Video file still exists after deletion attempt.");
        }
      } else {
        console.log(`Video file not found at path: ${videoPath}`);
      }
    }

    if (video.pdf) {
      const pdfPath = path.join(video.pdf);
      if (fs.existsSync(pdfPath)) {
        await unlinkFile(pdfPath);
        console.log(`PDF file deleted: ${pdfPath}`);
      } else {
        console.log(`PDF file not found at path: ${pdfPath}`);
      }
    }

    // Delete associated PPT file if it exists
    if (video.ppt) {
      const pptPath = path.join(video.ppt);
      if (fs.existsSync(pptPath)) {
        await unlinkFile(pptPath);
        console.log(`PPT file deleted: ${pptPath}`);
      } else {
        console.log(`PPT file not found at path: ${pptPath}`);
      }
    }

    // Delete associated document file if it exists
    if (video.doc) {
      const documentPath = path.join(video.doc);
      if (fs.existsSync(documentPath)) {
        await unlinkFile(documentPath);
        console.log(`Document file deleted: ${documentPath}`);
      } else {
        console.log(`Document file not found at path: ${documentPath}`);
      }
    }

    // Delete the video document from the database
    await Video.findByIdAndDelete(videoId);

    res.json({ message: "Video deleted successfully" });
  } catch (error) {
    console.error("Error deleting video or associated files:", error);
    res.status(500).json({
      status: 500,
      error: "Server error while deleting video",
    });
  }
};

const updateVideoOrder = async (req, res) => {
  const { videos } = req.body;

  if (!Array.isArray(videos)) {
    return res.status(400).json({
      status: 400,
      message: "Invalid data format. 'videos' should be an array.",
    });
  }

  try {
    // Loop through each video and upDate its order
    for (const video of videos) {
      await Video.updateOne(
        { _id: video._id },
        { $set: { order: video.order } }
      );
    }
    res
      .status(200)
      .json({ status: 200, message: "Video order upDated successfully" });
  } catch (error) {
    console.error("Error updating video order:", error);
    res
      .status(500)
      .json({ status: 500, message: "Error updating video order" });
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

const upDateVideoProgress = async (req, res) => {
  try {
    const { userId, videoId, courseId, progress } = req.body;

    // ValiDate the inputs
    if (!userId || !videoId || !courseId || typeof progress !== "number") {
      return res.status(400).json({
        status: 400,
        message: "Invalid input data",
      });
    }

    // Check if progress is within 0-100
    if (progress < 0 || progress > 100) {
      return res.status(400).json({
        status: 400,
        message: "Progress must be between 0 and 100",
      });
    }

    // Find or create a VideoProgress entry
    let videoProgress = await VideoProgress.findOne({ userId, videoId });

    if (videoProgress) {
      if (progress > videoProgress.progress) {
        // UpDate the existing progress
        videoProgress.progress = progress;
        videoProgress.completed = progress === 100;
        videoProgress.upDatedAt = Date.now();
        await videoProgress.save();
      } else {
        return res.status(200).json({
          status: 401,
          message: "Progress should be greater than cureent video progress.",
        });
      }
    } else {
      // Create a new progress entry
      videoProgress = new VideoProgress({
        userId,
        videoId,
        courseId,
        progress,
        completed: progress === 100,
      });
      await videoProgress.save();
    }

    return res.status(200).json({
      status: 200,
      message: "Video progress upDated successfully",
    });
  } catch (error) {
    console.error("Error updating video progress:", error.message);
    return res.status(500).json({
      status: 500,
      message: "Failed to upDate video progress",
    });
  }
};

module.exports = {
  createVideo,
  getAllVideos,
  getVideosByCourse,
  upDateVideoDetails,
  coursechapters,
  deleteVideo,
  updateVideoOrder,
  videotoggleButton,
  upDateVideoProgress,
};
