const bcrypt = require("bcrypt");
const userModel = require("../Model/userModel");
const jwt = require("jsonwebtoken");
const SECRET_KEY = process.env.SECRET_KEY;

const generateOTP = () => {
  // Generate a 4-digit OTP
  return Math.floor(1000 + Math.random() * 9000).toString();
};

// Controller for admin login
const login = async (req, res) => {
  const { name, phoneNumber, otp } = req.body;

  try {
    // Find the user by phone number
    const existingUser = await userModel.findOne({ phoneNumber: phoneNumber });
    if (!existingUser) {
      return res.status(404).json({ message: "User doesn't exist!" });
    }

    // Verify that the name matches
    if (existingUser.name !== name) {
      return res.status(401).json({ message: "Name does not match!" });
    }

    // Check if OTP matches and is not expired
    if (existingUser.otp !== otp || existingUser.otpExpiry < Date.now()) {
      return res
        .status(401)
        .json({ status: 401, message: "Invalid or expired OTP!" });
    }

    // OTP is valid, generate JWT token
    const token = jwt.sign(
      { phoneNumber: existingUser.phoneNumber, id: existingUser._id },
      SECRET_KEY
    );

    // Clear OTP after successful login
    existingUser.otp = null;
    existingUser.otpExpiry = null;
    await existingUser.save();

    res.status(200).json({ user: existingUser, token: token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong!" });
  }
};

// Controller for admin registration
const register = async (req, res) => {
  const { name, phoneNumber } = req.body;

  try {
    // Check if the user already exists
    const existingUser = await userModel.findOne({ phoneNumber: phoneNumber });
    if (existingUser) {
      return res.status(400).json({ message: "User already registered!" });
    }

    // Generate OTP
    const otp = generateOTP();

    // Create new user with OTP and expiry time
    const newUser = new userModel({
      name,
      phoneNumber,
      otp,
      otpExpiry: Date.now() + 5 * 60 * 1000, // OTP valid for 5 minutes
    });

    await newUser.save();

    // Send OTP to the user's phone number
    // Example: await sendSms(phoneNumber, `Your OTP is ${otp}`);

    res
      .status(200)
      .json({ message: "User registered successfully, OTP sent!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong!" });
  }
};

const getAllUser = async (req, res) => {
  try {
    const {
      search,
      page = 1,
      limit = 4,
      sortBy = "name",
      order = "asc",
    } = req.query;

    const query = {};
    if (search) {
      query.name = new RegExp(search, "i");
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
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  login,
  register,
  getAllUser,
};
