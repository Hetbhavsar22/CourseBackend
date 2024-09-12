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
  resend_Otp,
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
    updateVideoDetails, deleteVideo, updateVideoOrder, videotoggleButton } = require('../Controller/admin/videoController');

//Admin Route
router.post("/login", login);
router.post("/verify-otp", verifyOTP);
router.post("/resend_Otp", resend_Otp);
router.post("/change_password", auth, changePassword);
router.post("/update_details", auth, updateDetails);
router.get("/get_details", auth, getAdminDetails);
router.get("/get_admin", auth, getAdminById);


//Course Route
router.post("/coursedetails", auth, createCourse);
router.get("/courseList", getAllCourses);
router.get("/coursedetails/:id", getCourseById);
router.post("/coursedetails/:courseId", updateCourse);
router.delete("/coursedetails/:id", auth, deleteCourse);
router.post("/courseCheckout", auth, courseCheckout);
router.patch("/:id/coursetoggleButton", coursetoggleButton);
router.get("/dashboard-stats", getdashboard);

//Course Purchase Order Id
router.post("/createOrder", createOrder);
router.get("/getOrder/:orderId", getOrderById);
router.get("/getallOrder", getallorders);
router.put("/editorder/:id", editOrder);
router.delete("/deleteorder/:id", deleteOrder);
router.post("/verify-payment", verifyPayment);
router.get("/purchased-courses-byuser/:userId", getEnrolledCourses);
router.get("/allPurchasedCourse", getAllCoursePurchases);
router.delete("/deletetransaction/:id", deleteCoursePurchase);
router.post("/refund", initiateRefund);
router.patch("/:id/coursePurchasetoggleButton", coursePurchasetoggleButton);

//Video Route
router.post('/:courseId/upload', createVideo);
router.get('/videodetails', auth, getAllVideos);
router.get("/courseWiseVideo", auth, getVideosByCourse);
router.post('/editvideodetails/:id', auth, updateVideoDetails);
router.delete('/videodetails/:id', auth, deleteVideo);
router.put('/updateVideoOrder', updateVideoOrder);
router.patch('/:id/videotoggleButton', videotoggleButton);

//Tags Route
router.post('/addtag', auth, addTag);
router.get('/getalltags', getAllTags);
router.put('/edittags/:id', auth, editTag);
router.delete('/deletetags/:id', deleteTag);
router.patch("/:id/tagtoggleButton", tagtoggleButton);

module.exports = router;
