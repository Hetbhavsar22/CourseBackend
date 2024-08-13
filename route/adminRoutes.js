const express = require('express');
const { login, register, getAdminDetails } = require('../Controller/adminLogincontroller');
const { changePassword, updateDetails } = require('../Controller/adminChangepassword');
const router = express.Router();

router.post('/login', login);
router.post('/register', register);
router.post('/change_password', changePassword);
router.post('/update_details', updateDetails);
router.get('/get_details', getAdminDetails);

module.exports = router;
