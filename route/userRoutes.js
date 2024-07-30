const express = require('express');
const { login, register } = require('../Controller/logincontroller');
const { changePassword, updateDetails } = require('../Controller/changepassword');
const router = express.Router();

router.post('/login', login);
router.post('/register', register);
router.post('/change_password', changePassword);
router.post('/update_details', updateDetails);

module.exports = router;
