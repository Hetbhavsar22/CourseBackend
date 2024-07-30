const bcrypt = require("bcrypt");
const userModel = require("../Model/userModel");
const jwt = require("jsonwebtoken");
const SECRET_KEY = process.env.SECRET_KEY;

// Controller for user login
const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const existingUser = await userModel.findOne({ email: email });
    if (!existingUser) {
      return res.status(404).json({ message: "User doesn't exist!" });
    }

    const isPasswordValid = await bcrypt.compare(password, existingUser.password);
    if (!isPasswordValid) {
      return res.status(400).json({
        status: 401,
        message: "Invalid Credentials!"
      });
    }

    const token = jwt.sign({ email: existingUser.email, id: existingUser._id }, SECRET_KEY);
    res.status(200).json({ user: existingUser, token: token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong!" });
  }
};

// Controller for user registration
const register = async (req, res) => {
  const { profileImage, name, password, email } = req.body;

  try {
    const existingUser = await userModel.findOne({ email: email });
    if (existingUser) {
      return res.status(400).json({
        status: 401,
        message: 'User Already Exist!'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await userModel.create({
      profileImage: profileImage,
      name: name,
      password: hashedPassword,
      email: email
    });

    const token = jwt.sign({ email: result.email, id: result._id }, SECRET_KEY);

    res.status(201).json({ user: result, token: token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong!" });
  }
};

module.exports = {
  login,
  register
};
