const bcrypt = require("bcrypt");
const adminModel = require("../Model/adminModel");
const jwt = require("jsonwebtoken");
const SECRET_KEY = process.env.SECRET_KEY;

// Controller for admin login
const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const existingAdmin = await adminModel.findOne({ email: email });
    if (!existingAdmin) {
      return res.status(404).json({ message: "Admin doesn't exist!" });
    }

    const isPasswordValid = await bcrypt.compare(password, existingAdmin.password);
    if (!isPasswordValid) {
      return res.status(400).json({
        status: 401,
        message: "Invalid Credentials!"
      });
    }

    const token = jwt.sign({ email: existingAdmin.email, id: existingAdmin._id }, SECRET_KEY);
    res.status(200).json({ admin: existingAdmin, token: token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong!" });
  }
};

// Controller for admin registration
const register = async (req, res) => {
  const { profileImage, name, password, email } = req.body;

  try {
    const existingAdmin = await adminModel.findOne({ email: email });
    if (existingAdmin) {
      return res.status(400).json({
        status: 401,
        message: 'Admin Already Exist!'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await adminModel.create({
      profileImage: profileImage,
      name: name,
      password: hashedPassword,
      email: email
    });

    const token = jwt.sign({ email: result.email, id: result._id }, SECRET_KEY,{ expiresIn: '30d' });

    res.status(201).json({ admin: result, token: token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong!" });
  }
};

module.exports = {
  login,
  register
};
