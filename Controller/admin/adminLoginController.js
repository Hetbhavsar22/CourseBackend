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
const generateToken = (adminDetail, browserFingerprint) => {
  const payload = {
    id: adminDetail._id,
    email: adminDetail.email,
    name: adminDetail.name,
    browserFingerprint: browserFingerprint,  // Include browser/device info
    profile_image: adminDetail.profile_image,
    loginTime: Date.now(),  // Track login time
  };
// console.log(payload)
  const token = jwt.sign(payload, process.env.SECRET_KEY, { expiresIn: "24h" });

  return token;
};


const login = async (req, res) => {
  try {
    // Validation checks
    await Promise.all([
      body("email")
        .notEmpty()
        .withMessage("Email is required")
        .isEmail()
        .withMessage("Please enter a valid email address.")
        .isLength({ max: 100 })
        .withMessage("Email address cannot exceed 100 characters.")
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

    const { email, password, browserFingerprint } = req.body;
    const adminDetail = await adminModel.findOne({ email });

    if (!adminDetail) {
      return res.json({
        status: 401,
        message: "The email address you entered does not exist.",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, adminDetail.password);
    if (!isPasswordValid) {
      return res.json({
        status: 401,
        message: "The password you entered is incorrect.",
      });
    }

    const currentBrowserFingerprint = browserFingerprint;
    const currentTime = new Date();
    const lastLoginTime = new Date(adminDetail.last_login_time); // login_expire_time from the database
    const timeLeft = currentTime - lastLoginTime;
    const currentDate=new Date()
    // Calculate time left until the login expiration time

    // Convert milliseconds to hours
    const diffInHours = timeLeft / (1000 * 60 * 60);

    // console.log(adminDetail,currentBrowserFingerprint,diffInHours)

    if (diffInHours >=24 || diffInHours<0 || (adminDetail.last_Browser_finger_print===null ||  currentBrowserFingerprint!==adminDetail.last_Browser_finger_print[0])) {

      
    // Check if the current fingerprint is different from the last stored fingerprint
    if (adminDetail.last_Browser_finger_print !== currentBrowserFingerprint) {
      // InvaliDate previous sessions
      adminDetail.last_Browser_finger_print = currentBrowserFingerprint;
      adminDetail.token = null;
    }
      // If more than 24 hours or new device/browser, prompt for OTP
      adminDetail.otp = generateOTP();
      adminDetail.last_login_time = new Date(currentDate.getTime()); // UpDate login expiration time

      adminDetail.otp_expire_time = new Date(currentDate.getTime() + 5 * 60000); // 5-minute expiration
      adminDetail.verification_token = generateOtpVerificationToken();
   // adminDetail.last_login_time = new Date(
      //   currentDate.getTime() + 60 * 1000
      // );
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

      await adminDetail.save();

      return res.json({
        status: 200,
        message: "An OTP has been sent to your registered mobile number.",
        data: {
          verification_token: adminDetail.verification_token,
          is_otp_required: true,
          otp: adminDetail.otp, // For debugging; you should remove this in production
        },
      });
    }  else {
      // Generate a new token with the current login time and browser fingerprint
      const token = generateToken(adminDetail, browserFingerprint);
      adminDetail.token = token;
      adminDetail.last_login_time = new Date(currentDate.getTime());
      // console.log(token)
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
          browserFingerprint: browserFingerprint
        },
      });
    }
  } catch (error) {
    console.error("Login error:", error);
    return res.json({
      status: 500,
      message: "An error occurred during login. Please try again later.",
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

    const { otp, verification_token, browserFingerprint } = req.body;

    // console.log("Received browser fingerprint:", browserFingerprint);

    const adminDetail = await adminModel.findOne({ verification_token });

    if (!adminDetail) {
      return res.json({
        status: 401,
        message: "The verification token you provided is invalid.",
      });
    }

    const currentDate = new Date();

    if (adminDetail.otp !== otp) {
      return res.json({
        status: 401,
        message: "The OTP you entered is incorrect.",
      });
    }

    if (
      adminDetail.otp_expire_time &&
      currentDate > adminDetail.otp_expire_time
    ) {
      return res.json({
        status: 401,
        message: "The OTP has expired",
      });
    }

    // OTP is valid, now check if browser fingerprint already exists
    // const userAgent = req.headers["user-agent"];
    // const browserFingerprintShort = userAgent.split(" ").slice(-2).join(" ");

    // // Initialize browser_fingerprints array if not already initialized
    // if (!adminDetail.browserFingerprint) {
    //   adminDetail.browserFingerprint = [];
    // }

    // // Check if the fingerprint is already in the array
    // const fingerprintExists = adminDetail.browserFingerprint.includes(browserFingerprintShort);

    // if (!fingerprintExists) {
    //   // Add the new browser fingerprint to the array
    //   adminDetail.browserFingerprint.push(browserFingerprintShort);
    // }

    // const fingerprintExists = adminDetail.last_Browser_finger_print.includes(browserFingerprint);

    // if (!fingerprintExists) {
    //   // Add the new browser fingerprint to the array
    //   adminDetail.last_Browser_finger_print.push(browserFingerprint);
    // }

    // console.log("Before upDate, browser_fingerprints:", adminDetail.last_Browser_finger_print);
    const fingerprintExists = adminDetail.last_Browser_finger_print?.includes(browserFingerprint);

    if (!fingerprintExists) {
      // Add the new browser fingerprint to the array
      adminDetail.last_Browser_finger_print.push(browserFingerprint);
      console.log(`Added new browser fingerprint: ${browserFingerprint}`);
    } else {
      console.log(`Browser fingerprint already exists: ${browserFingerprint}`);
    }

    const token = generateToken(adminDetail, browserFingerprint);

    adminDetail.token = token;
    adminDetail.otp = null;
    adminDetail.verification_token = null;
    adminDetail.otp_expire_time = null;
    adminDetail.last_login_time = new Date(
      currentDate.getTime()
    );

    await adminDetail.save();
    // console.log("After upDate, browser_fingerprints:", adminDetail.last_Browser_finger_print); 

    return res.json({
      status: 200,
      message: "OTP verified successfully",
      data: {
        id: adminDetail._id,
        name: adminDetail.name,
        email: adminDetail.email,
        profile_image: adminDetail.profile_image,
        token: token,
        browserFingerprint: browserFingerprint
      },
    });
  } catch (error) {
    console.error("OTP Verification error:", error);
    return res.json({
      status: 401,
      message: "An error occurred during OTP verification. Please try again later.",
    });
  }
};

const resend_Otp = async (req, res) => {
  try {
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
        message: "The verification token you provided is invalid.",
      });
    }

    const currentDate = new Date();

    const otp = await generateOTP();
    adminDetail.otp = otp;
    adminDetail.otp_expire_time = new Date(currentDate.getTime() + 15 * 60000); // OTP expires in 15 minutes

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
        otp: adminDetail.otp,
      },
    });
  } catch (error) {
    console.error("Error in /admin/resendOTP:", error);
    return res.json({
      status: 500,
      message: "An error occurred while resending the OTP. Please try again later.",
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
      message: "An internal server error occurred.",
    });
  }
};

const getAdminById = async (req, res) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    const decodedToken = jwt.verify(token, process.env.SECRET_KEY);
    const adminId = decodedToken.id;

    const adminDetail = await adminModel.findById(adminId);
    if (!adminDetail) {
      return res.json({
        status: 404,
        message: "Admin not found",
      });
    }

    res.json({
      status: 200,
      data: {
        id: adminDetail._id,
        name: adminDetail.name,
        email: adminDetail.email,
        profile_image: adminDetail.profile_image,
        token: token,
      },
    });
  } catch (error) {
    console.error("Error fetching admin details:", error);
    res.json({
      status: 500,
      message: "An error occurred while fetching admin details.",
    });
  }
};

const verifyToken = async (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1]; // Bearer token format
  
  if (!token) {
    return res.status(401).json({
      status: 401,
      message: "Access denied. No token provided.",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY); // Decode the token using JWT and secret key

    // Extract data from the decoded token
    const { id ,browserFingerprint} = decoded;
    
    // console.log(decoded)

    // Fetch admin details from database
    const adminDetail = await adminModel.findById(id);
    
    if (!adminDetail) {
      return res.json({
        status: 404,
        message: "Admin not found",
      });
    }

    // Get current time and admin's login expiration time from admin details
    const currentTime = new Date();
    const lastLoginTime = new Date(adminDetail.last_login_time); // login_expire_time from the database
    const timeLeft = currentTime - lastLoginTime;

    // Calculate time left until the login expiration time

    // Convert milliseconds to hours
    const diffInHours = timeLeft / (1000 * 60 * 60);
    // Debugging logs

    const isAdminRequest = req.originalUrl.startsWith('/admin');

    // Check if the time left exceeds the 24-hour expiration time
    if (isAdminRequest) {
    if (diffInHours >=24 || diffInHours<0) {
      return res.status(401).json({
        status: 401,
        message: "OTP verification required after 24 hours.",
        is_otp_required: true,
      });
    }
    // Check if the time left exceeds the 1-hour re-login requirement
    // console.log(diffInHours)
    // console.log(adminDetail)
    if ( diffInHours>=1) {
      return res.status(401).json({
        status: 401,
        message: "Please log in with email and password after 1 hour of inactivity.",
      });
    }
    // console.log(browserFingerprint,adminDetail.last_Browser_finger_print)
    if(browserFingerprint!==adminDetail.last_Browser_finger_print[0]){
      return res.status(401).json({
        status:401,
        message:"You must login in to one browser only"
      })
    }
  }
    // Attach the admin details to the request object
    req.user = {
      id: adminDetail._id,
      email: adminDetail.email,
      name: adminDetail.name,
      profile_image: adminDetail.profile_image,
      browserFingerprint: adminDetail.last_Browser_finger_print, // or as required
    };
    res.status(200).json({
      status:200,
      message:"Verify Successfull"
    })
    next(); // Proceed to the next middleware or route handler
  } catch (error) {
    console.error("Token verification error:", error);
    return res.status(401).json({
      status: 401,
      message: "Invalid or expired token. Please log in again.",
    });
  }
};

const logout=async(req,res)=>{
  const token = req.headers["authorization"]?.split(" ")[1]; // Bearer token format
  const decoded = jwt.verify(token, process.env.SECRET_KEY); // Decode the token using JWT and secret key
  // Extract data from the decoded token
  const { id ,browserFingerprint} = decoded;
  
  const adminDetail = await adminModel.findById(id);
    
  if (!adminDetail) {
    return res.json({
      status: 404,
      message: "Admin not found",
    });
  }
  adminDetail.token = null;
  adminDetail.last_login_time=null
  adminDetail.last_Browser_finger_print=null;
  await adminDetail.save();

  return res.json({
    status: 200,
    message: "Logout Successfully",
    data: {
      id: adminDetail._id,
      name: adminDetail.name,
      email: adminDetail.email,
      profile_image: adminDetail.profile_image,
      token: token,
    },
  });
}

module.exports = {
  login,
  verifyOTP,
  getAdminDetails,
  getAdminById,
  resend_Otp,
  verifyToken,
  logout
};
