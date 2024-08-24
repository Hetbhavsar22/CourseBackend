const Razorpay = require("razorpay");
const Order = require("../../Model/oder_IdModel");
const userModel = require("../../Model/userModel");
const Course = require("../../Model/courseModel");
const CoursePurchase = require("../../Model/coursePurchaseModel");
const Enrollment = require("../../Model/enrollmentModel");
const crypto = require("crypto");
const mongoose = require("mongoose");
const { RAZORPAY_ID_KEY, RAZORPAY_SECRET_KEY } = process.env;

const instance = new Razorpay({
  key_id: RAZORPAY_ID_KEY,
  key_secret: RAZORPAY_SECRET_KEY,
});

const createOrder = async (req, res) => {
  try {
    const { courseId, userId, amount, currency } = req.body;

    // Generate a short receipt ID
    const shortUserId = userId.slice(-6);
    const shortCourseId = courseId.slice(-6);
    const receipt = `recpt_${shortUserId}_${shortCourseId}_${Date.now()}`;

    // Generate a unique secret key for this order
    const secretKey = crypto.randomBytes(32).toString("hex");

    const options = {
      amount: amount * 100,
      currency: currency || "INR",
      receipt: receipt,
    };

    // Create order on Razorpay
    instance.orders.create(options, async (err, order) => {
      if (err) {
        console.error("Razorpay Order Error:", err);
        return res.status(400).send({
          status: 400,
          success: false,
          msg: "Something went wrong!",
          error: err.message,
        });
      }

      // Create order in our database with the unique secret key
      const newOrder = new Order({
        courseId,
        userId,
        amount,
        currency,
        razorpayOrderId: order.id,
        secretKey, // Save the unique secret key with the order
      });

      await newOrder.save();

      res.status(200).send({
        status: 200,
        success: true,
        msg: "Order Created",
        order_id: order.id,
        key_id: process.env.RAZORPAY_ID_KEY,
        course_name: req.body.name,
      });
    });
  } catch (error) {
    console.error("Server Error:", error.message);
    res.status(500).send({
      status: 500,
      success: false,
      msg: "Server Error",
    });
  }
};

const getOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;
    console.log("Received orderId:", orderId);

    // Attempt to find the order by its MongoDB _id
    const order = await Order.findById(orderId);

    if (!order) {
      console.log("Order not found in database"); // Additional log
      return res.status(404).send({
        status: 404,
        success: false,
        msg: "Order not found",
      });
    }

    console.log("Order found:", order); // Additional log to check the order object

    res.status(200).send({
      status: 200,
      success: true,
      order: {
        courseId: order.courseId,
        userId: order.userId,
        razorpayOrderId: order.razorpayOrderId,
        amount: order.amount,
        currency: order.currency,
        status: order.status,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      },
    });
  } catch (error) {
    console.error("Server Error:", error.message);
    res.status(500).send({
      status: 500,
      success: false,
      msg: "Server Error",
    });
  }
};

// Get all orders
const getallorders = async (req, res) => {
  try {
    const {
      search,
      page = 1,
      limit = 4,
      sortBy = "createdAt",
      order = "desc",
    } = req.query;

    const query = {};
    //   if (search) {
    //     query["$or"] = [
    //       { "userId.name": new RegExp(search, "i") },
    //       { "courseId.cname": new RegExp(search, "i") }
    //     ];
    //   }
    if (search) {
      query.userName = new RegExp(search, "i");
    }

    const totalOrders = await Order.countDocuments(query);
    const pageCount = Math.ceil(totalOrders / limit);

    const orders = await Order.find(query)
      .populate("userId", "name")
      .populate("courseId", "cname")
      .sort({ [sortBy]: order === "asc" ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .exec();

    res.json({
      orders: orders.map((order) => ({
        ...order._doc,
        userName: order.userId.name,
        courseName: order.courseId.cname,
      })),
      page: parseInt(page),
      pageCount,
      totalOrders,
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({
      status: 500,
      message: error.message,
    });
  }
};

const editOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, currency, status } = req.body;

    const updatedOrder = await Order.findByIdAndUpdate(
      id,
      { amount, currency, status, updatedAt: Date.now() },
      { new: true } // Return the updated document
    );

    if (!updatedOrder) {
      return res.status(404).json({
        status: 404,
        message: "Order not found",
      });
    }

    res.json({
      status: 200,
      message: "Order updated successfully",
      order: updatedOrder,
    });
  } catch (error) {
    res.status(500).json({
      status: 500,
      message: error.message,
    });
  }
};

const deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedOrder = await Order.findByIdAndDelete(id);

    if (!deletedOrder) {
      return res.status(404).json({
        status: 404,
        message: "Order not found",
      });
    }

    res.json({
      status: 200,
      message: "Order deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      status: 500,
      message: error.message,
    });
  }
};

const verifyPayment = async (req, res) => {
  try {
    const {
      razorpayPaymentId,
      razorpayOrderId,
      razorpaySignature,
      customerDetails,
      courseId,
    } = req.body;

    console.log("Received razorpayOrderId: ", razorpayOrderId);
    console.log("Received razorpayPaymentId: ", razorpayPaymentId);
    console.log("Received razorpaySignature: ", razorpaySignature);

    // Validate Razorpay signature
    if (!process.env.RAZORPAY_SECRET_KEY) {
      return res
        .status(500)
        .json({
          success: false,
          message: "Razorpay key secret is not configured.",
        });
    }

    const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_SECRET_KEY);
    hmac.update(razorpayOrderId + "|" + razorpayPaymentId);
    const generatedSignature = hmac.digest("hex");

    console.log("Generated Signature:", generatedSignature);

    // if (generatedSignature !== razorpaySignature) {
    //     console.log("Signature mismatch! Generated:", generatedSignature, " Provided:", razorpaySignature);
    //     return res.status(400).json({ success: false, message: 'Invalid signature' });
    // }

    // Fetch course details
    const course = await Course.findById(courseId);
    const user = await userModel.findById(customerDetails.userId);
    if (!course || !user) {
      return res
        .status(404)
        .json({ success: false, message: "Course or User not found" });
    }

    // Calculate GST based on the courseGst percentage
    const amountWithoutGst = customerDetails.amount;
    const gstPercentage = course.courseGst || 0;
    const totalGst = (amountWithoutGst * gstPercentage) / 100;

    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    const isFromGujarat = customerDetails.city === "Gujarat";
    if (isFromGujarat) {
      cgst = totalGst / 2;
      sgst = totalGst / 2;
    } else {
      igst = totalGst;
    }

    const totalPaidAmount = amountWithoutGst + totalGst;

    // Create course purchase record
    const coursePurchase = new CoursePurchase({
      courseId,
      userId: customerDetails.userId,
      transactionId: razorpayPaymentId,
      customerName: customerDetails.name,
      customerEmail: customerDetails.email,
      mobileNumber: customerDetails.mobile,
      customerCity: customerDetails.city,
      amountWithoutGst,
      cgst,
      sgst,
      igst,
      totalGst: isFromGujarat ? cgst + sgst : igst,
      totalPaidAmount,
      paymentMode: customerDetails.paymentMode,
      invoiceNumber: "INV-" + Date.now(),
    });

    await coursePurchase.save();

    // Enroll the user in the course
    const enrollment = new Enrollment({
      courseId,
      userId: customerDetails.userId,
      percentageCompleted: 0, // Starting with 0% completion
    });
    await enrollment.save();

    res
      .status(200)
      .json({
        success: true,
        message:
          "Payment verified, course purchased, and user enrolled successfully.",
      });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// router.get("/purchased-courses/:userId", async (req, res) => {
  const purchasedCourses = async (req, res) => {
    try {
      const { userId } = req.params;
  
      // Ensure the userId is correctly formatted
      const userObjectId = new mongoose.Types.ObjectId(userId);
      console.log("User ObjectId:", userObjectId);
  
      // Find all purchases by the user
      const purchases = await CoursePurchase.find({ userId: userObjectId }).populate('courseId');
      console.log("Purchases found:", purchases);
  
      if (!purchases || purchases.length === 0) {
        return res.status(404).json({ success: false, message: "No courses found for this user" });
      }
  
      // Extract course details from purchases
      const purchasedCourses = purchases.map(purchase => ({
        courseId: purchase.courseId._id,
        courseName: purchase.courseId.cname,
        amountPaid: purchase.totalPaidAmount,
        purchaseDate: purchase.transactionDate,
      }));
  
      res.status(200).json({ success: true, courses: purchasedCourses });
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
  };

module.exports = {
  createOrder,
  getOrderById,
  getallorders,
  editOrder,
  deleteOrder,
  verifyPayment,
  purchasedCourses,
};
