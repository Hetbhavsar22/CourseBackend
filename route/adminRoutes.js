const express = require("express");
const multer = require("multer");
const auth = require("../middleware/adminAuth");
const router = express.Router();
const upload = multer();
const Video = require('../Model/videoModel')
const Course = require("../Model/courseModel");
const { addTag, getAllTags, editTag, deleteTag, tagtoggleButton } = require('../Controller/admin/tagsController');
const {
  login,
  verifyOTP,
  verifyToken,
  resend_Otp,
  logout,
  getAdminDetails,
  getAdminById,
} = require("../Controller/admin/adminLoginController");
const {
  changePassword,
  updateDetails,
} = require("../Controller/admin/adminChangepassword");
const {
  createCourse,
  getAllCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  courseCheckout,
  coursetoggleButton,
  getdashboard,
} = require("../Controller/admin/courseController");
  const {
    createOrder,
    getOrderById,
    getallorders,
    editOrder,
    deleteOrder,
    verifyPayment,
    getAllCoursePurchases,
    deleteCoursePurchase,
    initiateRefund,
    coursePurchasetoggleButton,
    getEnrolledCourses  
  } = require("../Controller/admin/order_idController");
const { createVideo, getAllVideos, getVideosByCourse,
    // getVideo, getThumbnail, 
    upDateVideoDetails, deleteVideo, updateVideoOrder, coursechapters, videotoggleButton } = require('../Controller/admin/videoController');

//Admin Route
router.post("/login", login);
router.post("/verify-otp", verifyOTP);
router.post("/resend_Otp", resend_Otp);
router.post("/change_password", auth, changePassword);
router.post("/update_details", auth, updateDetails);
router.get("/get_details", auth, getAdminDetails);
router.get("/get_admin", auth, getAdminById);
router.get("/protected-route",verifyToken);
router.get("/logout",logout);

//Course Route
router.post("/coursedetails", auth, createCourse);
router.get("/courseList", auth, getAllCourses);
router.get("/coursedetails/:id", getCourseById);
router.post("/coursedetails/:courseId", auth, updateCourse);
router.delete("/coursedetails/:id", auth, deleteCourse);
router.post("/courseCheckout", auth, courseCheckout);
router.patch("/:id/coursetoggleButton", coursetoggleButton);
router.get("/dashboard-stats", auth, getdashboard);

//Course Purchase Order Id
router.post("/createOrder", createOrder);
router.get("/getOrder/:orderId", auth, getOrderById);
router.get("/getallOrder", auth, getallorders);
router.put("/editorder/:id", auth, editOrder);
router.delete("/deleteorder/:id", auth, deleteOrder);
router.post("/verify-payment", auth, verifyPayment);
router.get("/purchased-courses-byuser/:userId", auth, getEnrolledCourses);
router.get("/allPurchasedCourse", auth, getAllCoursePurchases);
router.delete("/deletetransaction/:id", auth, deleteCoursePurchase);
router.post("/refund", initiateRefund);
router.patch("/:id/coursePurchasetoggleButton", coursePurchasetoggleButton);

//Video Route
router.post('/:courseId/upload', auth, createVideo);
router.get('/videodetails', auth, getAllVideos);
router.get("/courseWiseVideo/:courseId", auth, getVideosByCourse);
router.post('/editvideodetails/:id', auth, upDateVideoDetails);
router.get('/coursechapters/:courseId', auth, coursechapters);
router.delete('/videodetails/:id', auth, deleteVideo);
router.put('/updateVideoOrder', updateVideoOrder);
router.patch('/:id/videotoggleButton', videotoggleButton);

//Tags Route
router.post('/addtag', auth, addTag);
router.get('/getalltags', auth, getAllTags);
router.put('/edittags/:id', auth, editTag);
router.delete('/deletetags/:id', auth, deleteTag);
router.patch("/:id/tagtoggleButton", tagtoggleButton);

module.exports = router;
