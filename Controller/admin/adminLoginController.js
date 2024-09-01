const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const adminModel = require("../../Model/adminModel");
const SECRET_KEY = process.env.SECRET_KEY;
const { body, validationResult } = require("express-validator");
require("dotenv").config();
const sendOTPObj = require("../../Externalapi/Sendotp");

const { ObjectId } = require("mongodb");

const generateOTP = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};
function generateOtpVerificationToken() {
  const objectId = new ObjectId();
  const hexString = objectId.toHexString();
  const uniqueString = hexString.padEnd(32, "0").substring(0, 32);
  return uniqueString;
}
const generateToken = (adminDetail) => {
  const payload = {
    id: adminDetail._id,
    email: adminDetail.email,
    name: adminDetail.name,
    profile_image: adminDetail.profile_image,
  };

  const token = jwt.sign(payload, process.env.SECRET_KEY, { expiresIn: "24h" });

  return token;
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
      body("browserFingerprint")
        .notEmpty()
        .withMessage("Browser fingerprint is required")
        .run(req),
    ]);

    const validationErrorObj = validationResult(req);
    if (!validationErrorObj.isEmpty()) {
      return res.json({
        status: 401,
        message: validationErrorObj.errors[0].msg,
      });
    }

    const { email, password } = req.body;
    const adminDetail = await adminModel.findOne({ email });

    if (!adminDetail) {
      return res.json({
        status: 401,
        message: "Email not exist",
      });
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      adminDetail.password
    );
    if (!isPasswordValid) {
      return res.json({
        status: 401,
        message: "Password is invalid",
      });
    }

    const browserFingerPrint =
      req.headers["user-agent"] + req.connection.remoteAddress;

    const currentDate = new Date();

    if (browserFingerPrint != adminDetail.last_Browser_finger_print) {
      adminDetail.otp = await generateOTP();
      adminDetail.otp_expire_time = new Date(currentDate.getTime() + 5 * 60000);
      adminDetail.verification_token = await generateOtpVerificationToken();
      adminDetail.login_expire_time = new Date(
        currentDate.getTime() + 24 * 60 * 60 * 1000
      );
      //Send otp to mobile number start
      /*var otpParams = {
        country_code: adminDetail.cointry_code,
        phone_number: adminDetail.mobile_number,
        project_name: "course",
        message_type: "send_opt",
        variable: {
          "#var1": adminDetail.otp,
        },
      };
      var otpResponse = await sendOTPObj.sendMobileOTP(otpParams);
      if (otpResponse.data.status !== 200) {
        return res.json({
          status: 401,
          message: 'Send otp issue.please try again later'
        });
      }*/
      //Send otp to mobile number end
      adminDetail.save();
      return res.json({
        status: 200,
        message: "OTP has been sent",
        data: {
          verification_token: adminDetail.verification_token,
          is_otp_required: true,
          otp: adminDetail.otp, //When project on production comment this line without forgot
        },
      });
    } else {
      const token = generateToken(adminDetail);
      adminDetail.token = token;
      adminDetail.login_expire_time = new Date(
        currentDate.getTime() + 24 * 60 * 60 * 1000
      );
      await adminDetail.save();

      return res.json({
        status: 200,
        message: "Login successful",
        data: {
          id: adminDetail._id,
          name: adminDetail.name,
          email: adminDetail.email,
          profile_image: adminDetail.profile_image,
          token: token,
        },
      });
    }
  } catch (error) {
    console.error("Login error:", error);
    return res.json({
      status: 401,
      message: "Something went wrong. please try again later",
    });
  }
};

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
      return res.json({
        status: 401,
        message: validationErrorObj.errors[0].msg,
      });
    }

    const { otp, verification_token } = req.body;

    const adminDetail = await adminModel.findOne({ verification_token });

    if (!adminDetail) {
      return res.json({
        status: 401,
        message: "Invalid verification token",
      });
    }

    const currentDate = new Date();

    if (adminDetail.otp !== otp) {
      return res.json({
        status: 401,
        message: "Invalid OTP",
      });
    }

    if (
      adminDetail.otp_expire_time &&
      currentDate > adminDetail.otp_expire_time
    ) {
      return res.json({
        status: 401,
        message: "OTP has expired",
      });
    }

    const token = generateToken(adminDetail);

    adminDetail.token = token;
    adminDetail.otp = null;
    adminDetail.verification_token = null;
    adminDetail.otp_expire_time = null;
    adminDetail.last_Browser_finger_print =
      req.headers["user-agent"] + req.connection.remoteAddress;
    adminDetail.login_expire_time = new Date(
      currentDate.getTime() + 24 * 60 * 60 * 1000
    ); // 24 hours

    await adminDetail.save();

    return res.json({
      status: 200,
      message: "OTP verified successfully",
      data: {
        id: adminDetail._id,
        name: adminDetail.name,
        email: adminDetail.email,
        profile_image: adminDetail.profile_image,
        token: token,
      },
    });
  } catch (error) {
    console.error("OTP Verification error:", error);
    return res.json({
      status: 401,
      message: "Something went wrong. Please try again later.",
    });
  }
};

const resend_Otp = async (req, res) => {
  try {
    // Validate request body
    await Promise.all([
      body("verification_token")
        .notEmpty()
        .withMessage("Verification token is required")
        .run(req),
    ]);

    const validationErrorObj = validationResult(req);
    if (!validationErrorObj.isEmpty()) {
      return res.json({
        status: 401,
        message: validationErrorObj.errors[0].msg,
      });
    }

    const { verification_token } = req.body;
    const adminDetail = await adminModel.findOne({ verification_token });

    if (!adminDetail) {
      return res.json({
        status: 401,
        message: "Invalid verification token",
      });
    }

    const currentDate = new Date();

    // Generate a new OTP
    const otp = await generateOTP();
    adminDetail.otp = otp;
    adminDetail.otp_expire_time = new Date(currentDate.getTime() + 15 * 60000); // OTP expires in 15 minutes

    // Save the updated admin with the new OTP
    await adminDetail.save();

    // Send OTP via SMS (commented out as per request)
    /*
    const otpParams = {
      country_code: adminDetail.country_code,
      phone_number: adminDetail.mobile_number,
      project_name: "course",
      message_type: "send_otp",
      variable: {
        "#var1": adminDetail.otp,
      },
    };
    try {
      const otpResponse = await sendOTPObj.sendMobileOTP(otpParams);
      if (otpResponse.data.status !== 200) {
        return res.json({
          status: 401,
          message: 'Failed to send OTP. Please try again later.',
        });
      }
    } catch (error) {
      console.error("Error sending OTP:", error.message);
      return res.json({
        status: 500,
        message: 'Failed to send OTP. Please try again later.',
      });
    }
    */

    return res.json({
      status: 200,
      message: "OTP has been resent successfully",
      data: {
        otp: adminDetail.otp, // When in production, comment out this line
      },
    });
  } catch (error) {
    console.error("Error in /admin/resendOTP:", error);
    return res.json({
      status: 500,
      message: "Something went wrong. Please try again later.",
    });
  }
};

const getAdminDetails = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, SECRET_KEY);
    const adminDetail = await adminModel.findById(decoded.id);

    if (!adminDetail) {
      return res.json({
        status: 404,
        message: "Admin not found",
      });
    }

    return res.json({
      status: 200,
      message: "Admin data fetched successfully",
      data: {
        id: adminDetail._id,
        name: adminDetail.name,
        email: adminDetail.email,
        profile_image: adminDetail.profile_image,
      },
    });
  } catch (error) {
    console.error("Get Admin Data error:", error);
    return res.json({
      status: 500,
      message: "Internal server error",
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
    const token = req.headers.authorization.split(" ")[1];
    const decodedToken = jwt.verify(token, process.env.SECRET_KEY);
    const adminId = decodedToken.id;

    const admin = await adminModel.findById(adminId);
    if (!admin) {
      return res.json({
        status: 404,
        message: "Admin not found",
      });
    }

    const adminData = {
      _id: admin._id,
      email: admin.email,
      name: admin.name,
      profile_image: admin.profile_image,
      mobile_number: admin.mobile_number,
    };

    res.json({
      status: 200,
      admin: adminData,
    });
  } catch (error) {
    console.error("Error fetching admin details:", error);
    res.json({
      status: 500,
      message: "Failed to fetch admin details",
    });
  }
};

module.exports = {
  login,
  verifyOTP,
  getAdminDetails,
  getAdminById,
  resend_Otp,
};
