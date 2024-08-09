const upload = require("../middleware/upload");
const Video = require("../Model/videoModel");
const Course = require("../Model/courseModel");
const adminModel = require("../Model/adminModel");
const path = require("path");
const fs = require("fs");
const util = require("util");

// Controller function to handle video and thumbnail uploads
// const uploadVideoAndThumbnail = (req, res) => {
//   console.log('req. body: ',req.body,'-----');
//   upload(req, res, (err) => {
//       if (err) {
//           console.error('Error uploading file:', err.message);
//           return res.status(400).json({ error: err.message });
//       }

//       console.log('Uploaded files:', req.files);

//       // Proceed with form data
//       const { title, sdescription, ldescription, tags, dvideo, typev, courseId, createdBy } = req.body;
//       console.log('createdby ',createdBy)
//       // Validate required fields
//       if (!createdBy || !courseId || !typev) {
//           return res.status(400).json({ error: 'Required fields are missing' });
//       }

//       // Determine the demo video status
//       const demoStatus = dvideo === 'true' ? "Use as a Demo Video" : "No demo video";

//       // Create a new video/document object
//       let newMedia = {
//           adminId: createdBy,
//           courseId,
//           title,
//           sdescription,
//           ldescription,
//           tags,
//           typev,
//           active: true,
//       };

//       // Check if it's a document upload
//       if (typev === 'document') {
//           newMedia.pdf = req.files['pdf'] ? req.files['pdf'][0].filename : undefined;
//           newMedia.ppt = req.files['ppt'] ? req.files['ppt'][0].filename : undefined;
//           newMedia.doc = req.files['doc'] ? req.files['doc'][0].filename : undefined;
//       }

//       // Check if it's a video upload
//       if (typev === 'video') {
//           newMedia.dvideo = demoStatus;
//           newMedia.thumbnail = req.files['thumbnail'] ? req.files['thumbnail'][0].filename : undefined;
//           newMedia.videofile = req.files['videofile'] ? req.files['videofile'][0].filename : undefined;
//       }

//       // Log the newMedia object for debugging
//       console.log('New Media Object:', newMedia);

//       // Create a new video/document instance
//       const newVideo = new Video(newMedia);

//       // Save to database
//       newVideo.save()
//           .then((savedVideo) => res.json({ message: 'Media uploaded successfully', video: savedVideo }))
//           .catch((err) => {
//               console.error('Database save error:', err.message);
//               res.status(500).json({ error: err.message });
//           });
//   });
// };

const createVideo = (req, res) => {
  console.log("req.body:", req.body);
  console.log("req.files:", req.files);

  upload(req, res, async (err) => {
    if (err) {
      console.error("Error uploading file:", err.message);
      return res.status(400).json({ error: err.message });
    }

    const {
      title,
      sdescription,
      ldescription,
      tags,
      dvideo,
      typev,
      courseId,
      createdBy,
    } = req.body;
    console.log("createdby:", createdBy);

    if (!createdBy || !courseId || !typev) {
      return res.status(400).json({ error: "Required fields are missing" });
    }

    const demoStatus =
      dvideo === "true" ? "Use as a Demo Video" : "No demo video";

    const newMedia = {
      adminId: createdBy,
      courseId,
      title,
      sdescription,
      ldescription,
      tags,
      typev,
      active: true,
    };

    if (typev === "document") {
      newMedia.pdf = req.files["pdf"]
        ? req.files["pdf"][0].filename
        : undefined;
      newMedia.ppt = req.files["ppt"]
        ? req.files["ppt"][0].filename
        : undefined;
      newMedia.doc = req.files["doc"]
        ? req.files["doc"][0].filename
        : undefined;
    }

    if (typev === "video") {
      newMedia.dvideo = demoStatus;
      newMedia.thumbnail = req.files["thumbnail"]
        ? req.files["thumbnail"][0].filename
        : undefined;
      newMedia.videofile = req.files["videofile"]
        ? req.files["videofile"][0].filename
        : undefined;
    }

    console.log("New Media Object:", newMedia);

    const newVideo = new Video(newMedia);

    newVideo
      .save()
      .then((savedVideo) =>
        res.json({ message: "Media uploaded successfully", video: savedVideo })
      )
      .catch((err) => {
        console.error("Database save error:", err.message);
        res.status(500).json({ error: err.message });
      });
  });
};

// Controller to get all videos
const getAllVideos = async (req, res) => {
  try {
    const { search, page = 1, limit = 10, sortBy = 'title', order = 'asc' } = req.query;
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
    .sort({ [sortBy]: order === 'asc' ? 1 : -1 })
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

    res.status(200).json({
      videoData: Array.isArray(videoData) ? videoData : [],
      page: parseInt(page),
      pageCount,
      totalVideo,
  });
  } catch (error) {
    console.error("Error fetching videos:", error);
    res.status(500).json({ error: "Failed to fetch videos" });
  }
};

// const getVideo = (req, res) => {
//   const { filename } = req.params;
//   const videoPath = path.join(__dirname, '../public/videos', filename);

//   res.sendFile(videoPath, (err) => {
//     if (err) {
//       console.error('Error serving video file:', err.message);
//       res.status(404).json({ error: 'Video file not found' });
//     }
//   });
// };

// // Route for serving thumbnail images by filename
// const getThumbnail = (req, res) => {
//   const { filename } = req.params;
//   console.log(filename)
//   const thumbnailPath = path.join(__dirname, '../public/thumbnails', filename);

//   res.sendFile(thumbnailPath, (err) => {
//     if (err) {
//       console.error('Error serving thumbnail image:', err.message);
//       res.status(404).json({ error: 'Thumbnail image not found' });
//     }
//   });
// };

const updateVideoDetails = (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      console.error("Error uploading file:", err.message);
      return res.status(400).json({ error: err.message });
    }

    // Extract video ID from the request parameters
    const videoId = req.params.id;
    if (!videoId) {
      return res.status(400).json({ error: "Video ID is required" });
    }

    // Extract updated fields from the request body
    const {
      title,
      sdescription,
      ldescription,
      dvideo,
      tags,
      typev,
      courseId,
      createdBy,
    } = req.body;

    console.log(courseId);
    console.log(createdBy);
    console.log(typev);
    // Validate required fields
    if (!createdBy || !courseId || !typev) {
      return res.status(400).json({ error: "Required fields are missing" });
    }

    try {
      // Find the video document by ID
      const video = await Video.findById(videoId);
      if (!video) {
        return res.status(404).json({ error: "Video not found" });
      }

      const demoStatus =
        dvideo === "true" ? "Use as a Demo Video" : "No demo video";
      // Update the video document with new data
      video.title = title || video.title;
      video.sdescription = sdescription || video.sdescription;
      video.ldescription = ldescription || video.ldescription;
      video.dvideo = demoStatus || video.demoStatus;
      video.tags = tags || video.tags;
      video.typev = typev || video.typev;
      video.courseId = courseId || video.courseId;
      video.adminId = createdBy || video.adminId;

      if (typev === "document") {
        video.dvideo = null;
        video.thumbnail = null;
        video.videofile = null;
        video.pdf = req.files["pdf"] ? req.files["pdf"][0].filename : undefined;
        video.ppt = req.files["ppt"] ? req.files["ppt"][0].filename : undefined;
        video.doc = req.files["doc"] ? req.files["doc"][0].filename : undefined;
      }
      if (typev === "video") {
        video.pdf = null;
        video.ppt = null;
        video.doc = null;
        video.dvideo = demoStatus;
        video.thumbnail = req.files["thumbnail"]
          ? req.files["thumbnail"][0].filename
          : undefined;
        video.videofile = req.files["videofile"]
          ? req.files["videofile"][0].filename
          : undefined;
      }
      console.log(video.videofile);
      console.log(video.thumbnail);
      console.log(video.pdf);
      console.log(video.ppt);
      console.log(video.doc);
      // Save the updated video document
      const updatedVideo = await video.save();
      res.json({ message: "Video updated successfully", video: updatedVideo });
    } catch (err) {
      console.error("Database update error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });
};

// Convert fs.unlink to a promise-based function
const unlinkFile = util.promisify(fs.unlink);
const deleteVideo = async (req, res) => {
  const videoId = req.params.id;

  if (!videoId) {
    return res.status(400).json({ error: "Video ID is required" });
  }

  try {
    // Find the video document by ID
    const video = await Video.findById(videoId);
    if (!video) {
      return res.status(404).json({ error: "Video not found" });
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
    res.status(500).json({ error: "Failed to delete video" });
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
    res.status(200).send("Video order updated successfully");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error updating video order");
  }
};

module.exports = {
  createVideo,
  getAllVideos,
  // getVideo,
  // getThumbnail,
  updateVideoDetails,
  deleteVideo,
  updateVideoOrder,
};
