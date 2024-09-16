const Course = require('../../Model/courseModel');
const Video = require('../../Model/videoModel');
const Enrollment = require('../../Model/enrollmentModel');
const User = require('../../Model/userModel');
const userModel = require('../../Model/userModel');

const getPurchasedCourseDetails = async (req, res) => {
    try {
      // const userId = req.user._id; // Assuming user ID is attached to req.user after authentication
      const { userId, courseId } = req.params;
  
      // Check if the user is enrolled in the course
      const enrollment = await Enrollment.findOne({ userId, courseId });
      if (!enrollment) {
        return res.status(403).json({ message: 'You are not enrolled in this course.' });
      }
  
      // Fetch the course details
      const course = await Course.findById(courseId);
      if (!course) {
        return res.status(404).json({ message: 'Course not found.' });
      }

      const user = await userModel.findById(courseId);
      if (!user) {
        return res.status(404).json({ message: 'User not found.' });
      }

      if (!userId) {
        return res.status(400).json({ message: 'User ID are required.' });
      }

      if (!courseId) {
        return res.status(400).json({ message: 'Course ID are required.' });
      }
  
      // Fetch all videos and documents associated with the course
      const videos = await Video.find({ courseId });  // Fetching videos with the matching courseId
  
      console.log("Videos:", videos);  // Log the videos array to check if it's fetching correctly
  
      // Structure the response
      const courseDetails = {
        courseId: course._id,
        cname: course.cname,
        description: course.shortDescription,
        longDescription: course.longDescription,
        courseImage: course.courseImage,
        hours: course.hours,
        totalVideo: course.totalVideo,
        language: course.language,
        price: course.price,
        dprice: course.dprice,
        courseType: course.courseType,
        percentage: enrollment.percentageCompleted,
        startTime: course.startTime,
        endTime: course.endTime,
        resourses: videos.map(video => ({
          videoId: video._id,
          title: video.title,
          description: video.description,
          thumbnail: video.thumbnail,
          videofile: video.videofile,
          pdf: video.pdf,
          ppt: video.ppt,
          doc: video.doc,
          tags: video.tags,
          type: video.type
        }))
      };
  
      res.status(200).json(courseDetails);
  
    } catch (error) {
      res.status(500).json({ message: 'Server error', error });
    }
  };
  

module.exports = {
  getPurchasedCourseDetails,
};
