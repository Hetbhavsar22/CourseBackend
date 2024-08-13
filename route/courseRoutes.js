const express = require('express');
const multer = require('multer');
const auth = require('../middleware/auth');
const {
  createCourse,
  getAllCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  courseCheckout,
  // courseValidationRules,
  // validate,
} = require('../Controller/courseController');
const router = express.Router();
const Course = require('../Model/courseModel');

const upload = multer();

router.post('/:adminId/coursedetails', 
  // courseValidationRules, validate, 
  createCourse);
router.get('/courseList', getAllCourses);
router.get('/coursedetails/:id', getCourseById);
router.post('/coursedetails/:courseId', updateCourse);
router.delete('/coursedetails/:id', deleteCourse);
router.post('/courseCheckout', courseCheckout);


// Route to toggle course activation status
router.patch('/:id/toggle', async (req, res) => {
    console.log(`PATCH request received for course ID: ${req.params.id}`);
    try {
      const course = await Course.findById(req.params.id);
      if (!course) {
        return res.status(404).json({ message: 'Course not found' });
      }
      course.active = !course.active;
      await course.save();
      res.status(200).json(course);
    } catch (error) {
      console.error("Error toggling course:", error);
      res.status(500).json({ message: 'Server error' });
    }
  });

module.exports = router;
