const bcrypt = require("bcrypt");
const adminModel = require("../../Model/adminModel");
const jwt = require("jsonwebtoken");
const { required } = require("joi");
const SECRET_KEY = process.env.SECRET_KEY;
const { body, validationResult } = require("express-validator");

const generateOTP = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

const login = async (req, res) => {
  try {
    await Promise.all([
      body("email")
        .notEmpty()
        .withMessage("Email is required")
        .isEmail()
        .withMessage("Enter a valid email address")
        .isLength({ max: 100 })
        .withMessage("Email address cannot be longer than 100 characters")
        .run(req),
      body("password").notEmpty().withMessage("Password is required").run(req),
    ]);
    const validationErrorObj = validationResult(req);
    if (!validationErrorObj.isEmpty()) {
      return res.json({
        status: 401,
        message: validationErrorObj.errors[0].msg,
      });
    }

    const { email, password } = req.body;

    const user = await adminModel.findOne({ email });
    if (!user) {
      return res.json({
        status: 401,
        message: "Email does not exist",
      });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.json({
        status: 401,
        message: "Invalid password",
      });
    }
    // Generate OTP
    const otp = generateOTP();
    const otp_expire_time = Date.now() + 5 * 60 * 1000; // 5 minutes from now
    // Save OTP and expiration time in the database
    user.otp_number = otp;
    user.otp_expire_time = otp_expire_time;
    user.save();
    return res.json({
      status: 200,
      message: "OTP sent to your mobile number.",
      otp, // Include this only for testing; usually, you would send this via SMS
    });
  } catch (error) {
    return res.json({
      status: 500,
      message: "Internal server error",
      error: error.message,
    });
  }
};

const verifyOTP = async (req, res) => {
  try {
    await body("email")
      .notEmpty()
      .withMessage("Email is required")
      .isEmail()
      .withMessage("Enter a valid email address")
      .isLength({ max: 100 })
      .withMessage("Email address cannot be longer than 100 characters")
      .run(req),
      await body("otp").notEmpty().withMessage("OTP is required").run(req);

    const validationErrorObj = validationResult(req);
    if (!validationErrorObj.isEmpty()) {
      return res.json({
        status: 401,
        message: validationErrorObj.errors[0].msg,
      });
    }

    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.json({
        status: 400,
        message: "Email and OTP are required.",
      });
    }
    const admin = await adminModel.findOne({ email: email });

    if (!admin) {
      return res.json({
        status: 400,
        message: "Admin does not exist.",
      });
    }

    // Check if the OTP is correct and not expired
    if (admin.otp_number !== otp) {
      return res.json({
        status: 400,
        message: "Invalid OTP.",
      });
    }

    const currentTime = new Date().getTime();
    const otpExpireTime = new Date(admin.otp_expire_time).getTime();
    if (currentTime > otpExpireTime) {
      // Remove expired OTP from the database
      await adminModel.updateOne(
        { email: email },
        { $unset: { otp_number: "", otp_expire_time: "" } }
      );

      return res.json({
        status: 400,
        message: "OTP has expired.",
      });
    }

    // Remove OTP from the database after successful verification
    await adminModel.updateOne(
      { email: email },
      { $unset: { otp_number: "", otp_expire_time: "" } }
    );

    // Generate JWT token
    const token = jwt.sign(
      {
        id: admin._id,
        profile_image: admin.profile_image,
        name: admin.name,
        email: admin.email,
        createdAt: admin.createdAt,
      },
      SECRET_KEY
    );

    if (!token) {
      return res.json({
        status: 500,
        message: "Something went wrong. Please try again later.",
      });
    }

    // Return success response
    return res.json({
      status: 200,
      data: {
        token: token,
        user: {
          id: admin._id,
          email: admin.email,
          profile_image: admin.profile_image,
          name : admin.name,
        },
      },
    });
  } catch (error) {
    return res.json({
      status: 500,
      message: error.message,
    });
  }
};

// Controller for admin registration
const register = async (req, res) => {
  try {
    await Promise.all([
      body("name")
        .notEmpty()
        .withMessage("Name is required")
        .isLength({ min: 3 })
        .withMessage("Name must be at least 3 characters long")
        .isLength({ max: 50 })
        .withMessage("Name cannot be longer than 50 characters")
        .matches(/^[a-zA-Z\s]+$/)
        .withMessage("Name can only contain letters and spaces")
        .run(req),
      body("email")
        .notEmpty()
        .withMessage("Email is required")
        .isEmail()
        .withMessage("Enter a valid email address")
        .isLength({ max: 100 })
        .withMessage("Email address cannot be longer than 100 characters")
        .run(req),
      body("password")
        .notEmpty()
        .withMessage("Password is required")
        .isLength({ min: 6 })
        .withMessage("Password must be at least 6 characters long")
        .matches(/\d/)
        .withMessage("Password must contain at least one number")
        .matches(/[a-z]/)
        .withMessage("Password must contain at least one lowercase letter")
        .matches(/[A-Z]/)
        .withMessage("Password must contain at least one uppercase letter")
        .matches(/[\W_]/)
        .withMessage("Password must contain at least one special character")
        .run(req),
      body("mobile_number")
        .notEmpty()
        .withMessage("Mobile number is required")
        .isMobilePhone()
        .withMessage("Enter a valid mobile number")
        .isLength({ min: 10, max: 10 })
        .withMessage("Mobile number must be of 10 digits")
        .run(req),
    ]);

    const validationErrorObj = validationResult(req);
    if (!validationErrorObj.isEmpty()) {
      return res.json({
        status: 401,
        message: validationErrorObj.errors[0].msg,
      });
    }

    const { name, email, password, mobile_number } = req.body;

    // Check if the email or mobile number already exists
    const existingUser = await adminModel.findOne({ email });
    if (existingUser) {
      return res.json({
        status: 401,
        message: "Email already exists",
      });
    }

    // Hash the password before saving
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new admin user without OTP generation
    const newUser = new adminModel({
      name,
      email,
      password: hashedPassword,
      mobile_number,
    });

    await newUser.save();

    return res.json({
      status: 200,
      message: "Registration successful",
      data: {
        id: newUser.id,
        email: newUser.email,
        mobile_number: newUser.mobile_number,
      },
    });
  } catch (error) {
    return res.json({
      status: 500,
      message: "Internal server error",
      error: error.message,
    });
  }
};

const getAdminDetails = async (req, res) => {
  try {
    const admins = await adminModel.find();
    res.json({
      admins,
    });
  } catch (error) {
    res.json({
      status: 500,
      message: error.message,
    });
  }
};

// Controller to get a admin by ID
const getAdminById = async (req, res) => {
  //   try {
  //     const adminId = req.params.id;
  //     const admin = await adminModel.findById(adminId);
  //     const test = {}
  //     if (!admin) {
  //       return res.json({
  //         status: 404, 
  //         message: "Admin not found" 
  //       });
  //     }
  //     test._id = admin._id;
  //     test.email = admin.email;
  //     test.name = admin.name;
  //     test.profile_image = admin.profile_image;
  //     test.mobile_number = admin.mobile_number;
  //     res.json({
  //       status: 200, test});
  //   } catch (error) {
  //     console.error("Error fetching admin:", error);
  //     res.json({
  //       status: 500, 
  //       message: "Server error" 
  //     });
  //   }
  // };

  try {
    const adminId = req.params.id;

    const admin = await adminModel.findById(adminId);
    const test = {}
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    test._id = admin._id;
      test.email = admin.email;
      test.name = admin.name;
      test.profile_image = admin.profile_image;
      test.mobile_number = admin.mobile_number;

    res.status(200).json({ test });
  } catch (error) {
    console.error("Error fetching admin details:", error);
    res.status(500).json({ message: "Failed to fetch admin details" });
  }
};

module.exports = {
  login,
  verifyOTP,
  register,
  getAdminDetails,
  getAdminById,
};
