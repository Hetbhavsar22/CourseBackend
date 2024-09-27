const bcrypt = require("bcrypt");
const userModel = require("../../Model/userModel");
const jwt = require("jsonwebtoken");
const SECRET_KEY = process.env.SECRET_KEY;
const { ObjectId } = require("mongodb");
const { body, validationResult } = require('express-validator');

const generateOTP = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

function generateOtpVerificationToken() {
  const objectId = new ObjectId();
  const hexString = objectId.toHexString();
  const uniqueString = hexString.padEnd(32, "0").substring(0, 32);
  return uniqueString;
}

const generateToken = (userDetail) => {
  const payload = {
    id: userDetail._id,
    email: userDetail.email,
    profile_image: userDetail.profile_image,
  };

  const token = jwt.sign(payload, process.env.SECRET_KEY, { expiresIn: "24h" });

  return token;
};


// Controller for admin login
const login = async (req, res) => {
  try {
    await Promise.all([
      body("phoneNumber")
        .notEmpty()
        .withMessage("Phone number is required")
        .isMobilePhone()
        .withMessage("Enter a valid phone number")
        .run(req),
    ]);

    const validationErrorObj = validationResult(req);
    if (!validationErrorObj.isEmpty()) {
      return res.status(400).json({
        status: 400,
        message: validationErrorObj.errors[0].msg,
      });
    }

    const { phoneNumber } = req.body;
    const userDetail = await userModel.findOne({ phoneNumber });

    if (!userDetail) {
      return res.status(400).json({
        status: 400,
        message: "Phone number not registered",
      });
    }

    const currentDate = new Date();
    const browserFingerPrint =
      req.headers["user-agent"] + req.connection.remoteAddress;

    if (
      currentDate > userDetail.login_expire_time ||
      browserFingerPrint !== userDetail.last_Browser_finger_print
    ) {
      // If the user needs OTP verification
      userDetail.otp = generateOTP();
      userDetail.otp_expire_time = new Date(currentDate.getTime() + 5 * 60000); // OTP valid for 5 minutes
      userDetail.verification_token = await generateOtpVerificationToken();
      userDetail.login_expire_time = new Date(
        currentDate.getTime() + 24 * 60 * 60 * 1000
      );

      // Send OTP to user via SMS
      /*var otpParams = {
        phoneNumber: userDetail.phoneNumber,
        project_name: "course",
        message_type: "send_opt",
        variable: {
          "#var1": userDetail.otp,
        },
      };
      var otpResponse = await sendOTPObj.sendMobileOTP(otpParams);
      if (otpResponse.data.status !== 200) {
        return res.json({
          status: 401,
          message: 'Send OTP issue. Please try again later.'
        });
      }*/

      userDetail.save();

      return res.status(200).json({
        status: 200,
        message: "OTP has been sent to your phone number",
        data: {
          verification_token: userDetail.verification_token,
          is_otp_required: true,
          // otp: userDetail.otp, // Remove this in production (used for testing purposes)
        },
      });
    } else {
      // If no OTP is required, log the user in directly
      const token = generateToken(userDetail);
      userDetail.token = token;
      userDetail.login_expire_time = new Date(
        currentDate.getTime() + 24 * 60 * 60 * 1000
      );

      await userDetail.save();

      return res.status(200).json({
        status: 201,
        message: "Login successful",
        data: {
          id: userDetail._id,
          phoneNumber: userDetail.phoneNumber,
          token: token,
        },
      });
    }
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      status: 500,
      message: "Something went wrong. Please try again later.",
    });
  }
};

// Controller for verifying OTP and logging in the user
const verifyOTP = async (req, res) => {
  try {
    await Promise.all([
      body("otp").notEmpty().withMessage("OTP is required").run(req),
      body("verification_token")
        .notEmpty()
        .withMessage("Verification token is required")
        .run(req),
    ]);

    const validationErrorObj = validationResult(req);
    if (!validationErrorObj.isEmpty()) {
      return res.status(400).json({
        status: 400,
        message: validationErrorObj.errors[0].msg,
      });
    }

    const { otp, verification_token } = req.body;

    const userDetail = await userModel.findOne({ verification_token });

    if (!userDetail) {
      return res.status(400).json({
        status: 400,
        message: "Invalid verification token",
      });
    }

    const currentDate = new Date();

    if (userDetail.otp !== otp) {
      return res.status(400).json({
        status: 400,
        message: "Invalid OTP",
      });
    }

    if (userDetail.otp_expire_time && currentDate > userDetail.otp_expire_time) {
      return res.status(400).json({
        status: 400,
        message: "OTP has expired",
      });
    }

    // Generate JWT token for authenticated requests
    const token = generateToken(userDetail);

    userDetail.token = token;
    userDetail.otp = null;
    userDetail.verification_token = null;
    userDetail.otp_expire_time = null;
    userDetail.last_Browser_finger_print =
      req.headers["user-agent"] + req.connection.remoteAddress;
    userDetail.login_expire_time = new Date(
      currentDate.getTime() + 24 * 60 * 60 * 1000
    );

    await userDetail.save();

    return res.status(200).json({
      status: 200,
      message: "OTP verified successfully",
      data: {
        id: userDetail._id,
        // phoneNumber: userDetail.phoneNumber,
        token: token,
      },
    });
  } catch (error) {
    console.error("OTP Verification error:", error);
    return res.status(500).json({
      status: 500,
      message: "Something went wrong. Please try again later.",
    });
  }
};

// Controller for user registration
const register = async (req, res) => {
  try {
    await Promise.all([
      body("phoneNumber")
        .notEmpty()
        .withMessage("Phone number is required")
        .isMobilePhone()
        .withMessage("Enter a valid phone number")
        .run(req),
    ]);

    const validationErrorObj = validationResult(req);
    if (!validationErrorObj.isEmpty()) {
      return res.status(400).json({
        status: 400,
        message: validationErrorObj.errors[0].msg,
      });
    }

    const { phoneNumber } = req.body;

    // Check if phone number is already registered
    const existingUser = await userModel.findOne({ phoneNumber });
    if (existingUser) {
      return res.status(400).json({
        status: 400,
        message: "Phone number already registered",
      });
    }

    // Register new user
    const newUser = new userModel({
      phoneNumber,
      login_expire_time: new Date(),
      otp: null,
      otp_expire_time: null,
      verification_token: null,
    });

    await newUser.save();

    return res.status(201).json({
      status: 201,
      message: "User registered successfully",
      // data: {
      //   id: newUser._id,
      //   phoneNumber: newUser.phoneNumber,
      // },
    });
  } catch (error) {
    console.error("User Registration Error:", error);
    return res.status(500).json({
      status: 500,
      message: "Something went wrong. Please try again later.",
    });
  }
};

const getAllUser = async (req, res) => {
  try {
    const {
      search,
      page = 1,
      limit = 4,
      sortBy = "createdAt",
      order = "desc",
    } = req.query;

    const query = {};

    if (search) {
      const regex = new RegExp(search, "i");

      // Check if the search term is a number (for phoneNumber search)
      const searchNumber = !isNaN(search) ? Number(search) : null;

      // Search by name, email, and phoneNumber
      query["$or"] = [
        { name: regex },              // Search by user name
        { email: regex },             // Search by email
        ...(searchNumber !== null ? [{ phoneNumber: searchNumber }] : []), // Search by phone number if the search is a number
      ];
    }

    // Calculate the total number of courses that match the query
    const totalUser = await userModel.countDocuments(query);

    // Calculate the total number of pages
    const pageCount = Math.ceil(totalUser / limit);
    // Fetch the Users for the current page
    const users = await userModel
      .find(query)
      .sort({ [sortBy]: order === "asc" ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({
      users,
      page: parseInt(page),
      pageCount,
      totalUser,
    });
  } catch (error) {
    res.json({
      status: 500, 
      message: error.message 
    });
  }
};

module.exports = {
  login,
  verifyOTP,
  register,
  getAllUser,
};
