const CoursePurchase = require("../../Model/coursePurchaseModel");
const mongoose = require("mongoose");
const { body, validationResult } = require("express-validator");
const { options } = require("joi");


// Create a new course purchase
const createCoursePurchase = async (req, res) => {
  try {
    // Validate request body
    await Promise.all([
      body("courseId")
        .notEmpty()
        .withMessage("Course ID is required")
        .isMongoId()
        .withMessage("Invalid Course ID format")
        .run(req),
      body("userId")
        .notEmpty()
        .withMessage("User ID is required")
        .isMongoId()
        .withMessage("Invalid User ID format")
        .run(req),
      body("transactionId")
        .notEmpty()
        .withMessage("Transaction ID is required")
        .isLength({ max: 100 })
        .withMessage("Transaction ID cannot be greater than 100 characters")
        .run(req),
      body("customerName")
        .optional()
        .isString()
        .withMessage("Customer name must be a string")
        .run(req),
      body("customerEmail")
        .optional()
        .isEmail()
        .withMessage("Enter a valid email address")
        .run(req),
      body("mobileNumber")
        .optional()
        .isNumeric()
        .withMessage("Mobile number must be numeric")
        .isLength({ min: 10, max: 10 })
        .withMessage("Mobile number must be 10 digits")
        .run(req),
      body("customerCity")
        .optional()
        .isString()
        .withMessage("Customer city must be a string")
        .run(req),
      body("currency")
        .optional()
        .isString()
        .withMessage("Currency must be a string")
        .run(req),
      body("amountWithoutGst")
        .notEmpty()
        .withMessage("Amount without GST is required")
        .isNumeric()
        .withMessage("Amount without GST must be a number")
        .run(req),
      body("paymentMode")
        .optional()
        .isIn([
          "Credit Card",
          "Debit Card",
          "Net Banking",
          "UPI",
          "Wallet",
          "Cash",
        ])
        .withMessage("Invalid payment mode")
        .run(req),
      body("invoiceNumber")
        .optional()
        .isLength({ max: 100 })
        .withMessage("Invoice number cannot be greater than 100 characters")
        .run(req),
      body("cancelBillNumber")
        .optional()
        .isLength({ max: 100 })
        .withMessage("Cancel bill number cannot be greater than 100 characters")
        .run(req),
      body("discountCode")
        .optional()
        .isString()
        .withMessage("Discount code must be a string")
        .run(req),
    ]);

    // Check for validation errors
    const validationErrors = validationResult(req);
    if (!validationErrors.isEmpty()) {
      return res.json({
        status: 400,
        message: validationErrors.errors[0].msg,
      });
    }

    // Extract fields from the request body
    const {
      courseId,
      userId,
      transactionId,
      customerName,
      customerEmail,
      mobileNumber,
      customerCity,
      currency,
      amountWithoutGst,
      paymentMode,
      invoiceNumber,
      cancelBillNumber,
      discountCode,
    } = req.body;

    // Define default GST values
    let igst = 0;
    let cgst = 0;
    let sgst = 0;
    let totalGst = 0;

    // Check if the user is from Gujarat
    const isGujarat = customerCity && customerCity.toLowerCase() === "gujarat";

    if (isGujarat) {
      // Apply CGST and SGST for Gujarat users
      cgst = amountWithoutGst * 0.09; // Assuming 9% CGST
      sgst = amountWithoutGst * 0.09; // Assuming 9% SGST
      totalGst = cgst + sgst;
    } else {
      // Apply IGST for users outside Gujarat
      igst = amountWithoutGst * 0.18; // Assuming 18% IGST
      totalGst = igst;
    }

    // Create a new course purchase entry
    const newPurchase = new CoursePurchase({
      courseId,
      userId,
      transactionId,
      customerName,
      customerEmail,
      mobileNumber,
      customerCity,
      currency,
      amountWithoutGst,
      igst,
      cgst,
      sgst,
      totalGst,
      totalPaidAmount: amountWithoutGst + totalGst,
      paymentMode,
      invoiceNumber,
      cancelBillNumber,
      discountCode,
    });

    // Save the entry to the database
    await newPurchase.save();

    return res.json({
      status: 201,
      success: true,
      message: "Course purchase recorded successfully",
      data: newPurchase,
    });
  } catch (error) {
    return res.json({
      status: 500,
      success: false,
      message: "Failed to record course purchase",
      error: error.message,
    });
  }
};

// Get all course purchases
const getAllCoursePurchases = async (req, res) => {
  try {
    const purchases = await CoursePurchase.find()
      .populate("courseId")
      .populate("userId");
    return res.json({
      status: 200,
      success: true,
      data: purchases,
    });
  } catch (error) {
    return res.json({
      status: 500,
      success: false,
      message: "Failed to retrieve course purchases",
      error: error.message,
    });
  }
};

// Get a course purchase by ID
const getCoursePurchaseById = async (req, res) => {
  try {
    const purchase = await CoursePurchase.findById(req.params.id)
      .populate("courseId")
      .populate("userId");
    if (!purchase) {
      return res.json({
        status: 404,
        success: false,
        message: "Course purchase not found",
      });
    }
    return res.json({
      status: 200,
      success: true,
      data: purchase,
    });
  } catch (error) {
    return res.json({
      status: 500,
      success: false,
      message: "Failed to retrieve course purchase",
      error: error.message,
    });
  }
};

// Delete a course purchase by ID
const deleteCoursePurchaseById = async (req, res) => {
  try {
    const purchase = await CoursePurchase.findByIdAndDelete(req.params.id);
    if (!purchase) {
      return res.json({
        status: 404,
        success: false,
        message: "Course purchase not found",
      });
    }
    return res.json({
      status: 200,
      success: true,
      message: "Course purchase deleted successfully",
    });
  } catch (error) {
    return res.json({
      status: 500,
      success: false,
      message: "Failed to delete course purchase",
      error: error.message,
    });
  }
};

module.exports = {
  createCoursePurchase,
  getAllCoursePurchases,
  getCoursePurchaseById,
  deleteCoursePurchaseById,
};
