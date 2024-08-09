const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer();
const Video = require('../Model/videoModel')
const { createVideo, getAllVideos, 
  // getVideo, getThumbnail, 
  updateVideoDetails, deleteVideo, updateVideoOrder } = require('../Controller/videoController');

// Route for handling video and thumbnail uploads
router.post('/:courseId/upload', createVideo);
router.get('/videodetails', getAllVideos);
// router.get('/:filename', getVideo);
// router.get('/image/:thumbnail', getThumbnail);
router.post('/editvideodetails/:id', updateVideoDetails);
router.delete('/videodetails/:id', deleteVideo);
router.post('/updateVideoOrder', updateVideoOrder);

// Route to toggle course activation status
router.patch('/:id/toggle', async (req, res) => {
    console.log(`PATCH request received for video ID: ${req.params.id}`);
    try {
      const video = await Video.findById(req.params.id);
      if (!video) {
        return res.status(404).json({ message: 'Video not found' });
      }
      video.active = !video.active;
      await video.save();
      res.status(200).json(video);
    } catch (error) {
      console.error("Error toggling video:", error);
      res.status(500).json({ message: 'Server error' });
    }
  });

module.exports = router;
