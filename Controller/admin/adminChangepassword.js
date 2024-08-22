const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const adminModel = require("../../Model/adminModel");
const jwt = require("jsonwebtoken");
const SECRET_KEY = process.env.SECRET_KEY;
const upload = require("../../middleware/upload");

const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const authHeader = req.headers.authorization;

  // Validate input fields
  if (!currentPassword || !newPassword) {
    return res.json({
      status: 400,
      message: "Current password and new password are required",
    });
  }

  // Validate authorization header
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.json({
      status: 401,
      message: "Authorization header missing or malformed",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    // Verify JWT token
    const decodedToken = jwt.verify(token, SECRET_KEY);
    const adminId = decodedToken.id;

    // Find the admin by ID
    const existingAdmin = await adminModel.findById(adminId);
    if (!existingAdmin) {
      return res.json({
        status: 404,
        message: "Admin not found!",
      });
    }

    // Compare the old password with the stored hashed password
    const isCurrentPasswordCorrect = await bcrypt.compare(
      currentPassword,
      existingAdmin.password
    );

    if (!isCurrentPasswordCorrect) {
      return res.json({
        status: 401,
        message: "Current password is incorrect!",
      });
    }

    // Validate new password
    if (newPassword.length < 6) {
      return res.json({
        status: 400,
        message: "New password must be at least 6 characters long",
      });
    }

    // Hash the new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update the admin's password
    existingAdmin.password = hashedNewPassword;
    await existingAdmin.save();

    res.json({
      status: 200,
      message: "Password changed successfully!",
    });
  } catch (error) {
    console.error("Error changing password:", error.message);
    res.json({
      status: 500,
      message: "Server error",
      error: error.message,
    });
  }
};

// Update details function
const updateDetails = async (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      console.error("Error uploading file:", err.message);
      return res.json({
        status: 400,
        message: "File upload error",
        error: err.message,
      });
    }

    // Validate authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.json({
        status: 401,
        message: "Authorization header missing or malformed",
      });
    }

    const token = authHeader.split(" ")[1];

    try {
      // Verify JWT token
      const decodedToken = jwt.verify(token, SECRET_KEY);
      const adminId = decodedToken.id;

      // Find the admin by ID
      const test = {}
      const existingAdmin = await adminModel.findById(adminId);
      if (!existingAdmin) {
        return res.json({
          status: 404,
          message: "Admin not found!",
        });
      }

      // Extract fields from the request body
      const { name } = req.body;

      // Validate input fields
      if (name && typeof name !== "string") {
        return res.json({
          status: 400,
          message: "Invalid name format. Name should be a string.",
        });
      }

      // Update admin details
      if (name) {
        existingAdmin.name = name;
        test.name = name;
      }

      // Update profile image if provided
      if (req.files && req.files.profileImage && req.files.profileImage[0]) {
        const file = req.files.profileImage[0];
        if (file.mimetype.startsWith("image/")) {
          existingAdmin.profile_image = `/profile_images/${file.filename}`;
          test.profile_image = `/profile_images/${file.filename}`;
        } else {
          return res.json({
            status: 400,
            message: "Invalid file type. Only images are allowed.",
          });
        }
      }
      test._id = existingAdmin._id;
      test.email = existingAdmin.email;
      // Save the updated admin details
      await existingAdmin.save();

      res.json({
        status: 200,
        message: "Details updated successfully!",
        // admin: existingAdmin,
        admin : test
      });
    } catch (error) {
      console.error("Error updating details:", error.message);
      res.json({
        status: 500,
        message: "Server error",
        error: error.message,
      });
    }
  });
};

module.exports = { changePassword, updateDetails };
