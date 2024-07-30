const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const userModel = require("../Model/userModel");
const jwt = require("jsonwebtoken");
const SECRET_KEY = process.env.SECRET_KEY;
const upload = require("../middleware/upload");

const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ message: "Authorization header missing or malformed" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decodedToken = jwt.verify(token, SECRET_KEY);
    const userId = decodedToken.id;

    const existingUser = await userModel.findById(userId);
    if (!existingUser) {
      return res.status(404).json({ message: "User doesn't exist!" });
    }

    // Compare the old password with the stored hashed password
    const isCurrentPasswordCorrect = await bcrypt.compare(
      currentPassword,
      existingUser.password
    );

    if (!isCurrentPasswordCorrect) {
      return res
        .status(401)
        .json({ message: "Current password is incorrect!" });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    existingUser.password = hashedNewPassword;
    await existingUser.save();

    res.status(200).json({ message: "Password changed successfully!" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Something went wrong!" });
  }
};

// Update details function
const updateDetails = async (req, res) => {
  console.log(req.body);
  upload(req, res, async (err) => {
    if (err) {
      console.error("Error uploading file:", err.message);
      return res.status(400).json({ error: err.message });
    }

    console.log("Uploaded files:", req.files);

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Authorization header missing or malformed" });
    }

    const token = authHeader.split(" ")[1];

    try {
      const decodedToken = jwt.verify(token, SECRET_KEY);
      const userId = decodedToken.id;

      const existingUser = await userModel.findById(userId);
      if (!existingUser) {
        return res.status(404).json({ message: "User not found!" });
      }

      // Update user details
      const { name } = req.body;
      if (name) {
        existingUser.name = name;
      }

      // Update profile image if provided
      if (req.file) {
        existingUser.profileImage = `/profile_images/${req.file.filename}`;
      }

      await existingUser.save();

      res
        .status(200)
        .json({ message: "Details changed successfully!", user: existingUser });
    } catch (error) {
      console.error("Error updating details:", error.message);
      res.status(500).json({ message: "Something went wrong!" });
    }
  });
};

module.exports = { changePassword, updateDetails };
