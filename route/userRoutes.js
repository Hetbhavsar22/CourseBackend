const multer = require('multer');
const express = require('express');
const { login, verifyOTP, register, getAllUser } = require('../Controller/user/userLoginController');
const { editUser, deleteUser } = require("../Controller/user/editUserController");
const userModel = require('../Model/userModel')
const { valiDateRequest } = require('../middleware/validationMiddleware');
const { upDateVideoProgress } = require('../Controller/admin/videoController');
const { getPurchasedCourseDetails } = require('../Controller/user/purchasedCourseController');
const authenticate = require('../middleware/userAuth');
// const { changePassword, upDateDetails } = require('../Controller/adminChangepassword');
const router = express.Router();

const upload = multer();

router.post('/login', login);
router.post('/verify-otp', verifyOTP);
router.post('/register', register);
router.get('/userList', getAllUser);
router.put("/editUser", upload.none(), editUser);
router.delete("/deleteUser/:id", deleteUser);
// router.post('/change_password', changePassword);
// router.post('/upDate_details', upDateDetails);

router.patch('/:id/toggle', async (req, res) => {
    console.log(`PATCH request received for user ID: ${req.params.id}`);
    try {
      const user = await userModel.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      user.active = !user.active;
      await user.save();
      res.status(200).json(user);
    } catch (error) {
      console.error("Error toggling user:", error);
      res.status(500).json({ message: 'Server error' });
    }
  });


  //Razorpay Route
  router.post('/purchase-course', valiDateRequest, (req, res) => {
    // Your course purchase logic here...
    res.status(200).json({ message: 'Course purchased successfully.' });
  });

  // video progress
  router.post("/video-progress", upDateVideoProgress);
  router.get('/purchased-course/:userId/:courseId',
    // authenticate, 
    getPurchasedCourseDetails);

module.exports = router;
