const Razorpay = require("razorpay");
const Order = require("../../Model/oder_IdModel");
const userModel = require("../../Model/userModel");
const Course = require("../../Model/courseModel");
const CoursePurchase = require("../../Model/coursePurchaseModel");
const Enrollment = require("../../Model/enrollmentModel");
const crypto = require("crypto");
const mongoose = require("mongoose");
require("dotenv").config();

const instance = new Razorpay({
  key_id: "rzp_test_ijIfGspQLSfEhH",
  key_secret: "2BchtClGW9UJJd6HmHpa898i",
});

const createOrder = async (req, res) => {
  try {
    const { courseId, userId, amount, currency } = req.body;

    console.log("courseId:", courseId);
    console.log("userId:", userId);
    console.log("amount:", amount);
    console.log("currency:", currency);

    if (!courseId || !userId) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid input data" });
    }

    const shortUserId = userId.slice(-6);
    const shortCourseId = courseId.slice(-6);
    const receipt = `recpt_${shortUserId}_${shortCourseId}_${Date.now()}`;

    const secretKey = crypto.randomBytes(32).toString("hex");

    const options = {
      amount: amount,
      currency: currency || "INR",
      receipt: receipt,
    };

    instance.orders.create(options, async (err, order) => {
      if (err) {
        console.error("Razorpay Order Error:", err);
        return res.send({
          status: 400,
          success: false,
          msg: "Something went wrong!",
          error: err.message,
        });
      }

      const newOrder = new Order({
        courseId,
        userId,
        amount: amount,
        currency,
        razorpayOrderId: order.id,
        secretKey,
      });

      await newOrder.save();

      res.send({
        status: 200,
        success: true,
        msg: "Order Created",
        order_id: order.id,
        key_id: process.env.RAZORPAY_ID_KEY,
        course_name: req.body.name,
      });
    });
  } catch (error) {
    console.error("Server Error:", error);
    res.send({
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

    const order = await Order.findById(orderId);

    if (!order) {
      console.log("Order not found in database");
      return res.status(404).send({
        status: 404,
        success: false,
        msg: "Order not found",
      });
    }

    console.log("Order found:", order);

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

const getallorders = async (req, res) => {
  try {
    const {
      search,
      page = 1,
      limit = 4,
      sortBy = "createdAt",
      order = "desc",
    } = req.query;

    const matchStage = {};
    if (search) {
      const regex = new RegExp(search, "i");

      // Check if the search term is a number (for amount search)
      const searchAmount = !isNaN(search) ? Number(search) : null;

      matchStage["$or"] = [
        { "user.name": regex },           // Search by user's name
        { "course.cname": regex },        // Search by course name
        { razorpayOrderId: regex },       // Search by Razorpay Order ID
        ...(searchAmount !== null ? [{ amount: searchAmount }] : []), // Search by amount if it's a number
      ];
    }

    const totalOrders = await Order.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $lookup: {
          from: "courselists",
          localField: "courseId",
          foreignField: "_id",
          as: "course",
        },
      },
      { $unwind: "$course" },
      {
        $match: matchStage,
      },
      {
        $count: "total",
      },
    ]);

    const orders = await Order.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $lookup: {
          from: "courselists",
          localField: "courseId",
          foreignField: "_id",
          as: "course",
        },
      },
      { $unwind: "$course" },
      {
        $match: matchStage,
      },
      {
        $sort: { [sortBy]: order === "asc" ? 1 : -1 },
      },
      {
        $skip: (page - 1) * limit,
      },
      {
        $limit: parseInt(limit),
      },
    ]);

    const totalRecords = totalOrders[0]?.total || 0;
    const pageCount = Math.ceil(totalRecords / limit);

    res.json({
      orders: orders.map((order) => ({
        ...order,
        userName: order.user.name,
        courseName: order.course.cname,
      })),
      page: parseInt(page),
      pageCount,
      totalOrders: totalRecords,
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
      { new: true }
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

const razorpayInstance = new Razorpay({
  key_id: "rzp_test_ijIfGspQLSfEhH",

  key_secret: "2BchtClGW9UJJd6HmHpa898i",
});

const nodemailer = require("nodemailer");

const verifyPayment = async (req, res) => {
  try {
    const {
      razorpayPaymentId,
      razorpayOrderId,
      razorpaySignature,
      customerDetails,
      courseId,
      key_secret = "2BchtClGW9UJJd6HmHpa898i",
    } = req.body;

    if (!key_secret) {
      return res.json({
        status: 500,
        success: false,
        message: "Razorpay key secret is not configured.",
      });
    }

    const hmac = crypto.createHmac("sha256", key_secret);
    const payload = `${razorpayOrderId}|${razorpayPaymentId}`;
    hmac.update(payload);
    const generatedSignature = hmac.digest("hex");

    if (generatedSignature !== razorpaySignature) {
      return res.json({
        status: 400,
        success: false,
        message: "Invalid signature",
      });
    }

    const course = await Course.findById(courseId);
    const user = await userModel.findById(customerDetails.userId);

    if (!course || !user) {
      return res.status(404).json({
        success: false,
        message: "Course or User not found",
      });
    }

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

    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, "0");

    const currentYearMonth = `${year}${month}`;
    const invoicePrefix = `COS-${currentYearMonth}`;

    // Count how many invoices have been created for this month
    const invoiceCount = await CoursePurchase.countDocuments({
      invoiceNumber: new RegExp(`^${invoicePrefix}`),
    });

    const invoiceNumber = `${invoicePrefix}${String(invoiceCount + 1).padStart(
      2,
      "0"
    )}`;

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
      invoiceNumber,
      cancelBillNumber: null,
    });

    await coursePurchase.save();

    const enrollment = new Enrollment({
      courseId,
      userId: customerDetails.userId,
      percentageCompleted: 0,
    });
    await enrollment.save();

    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: "erhetbhavsar@gmail.com",
        pass: "rmpeeebgdehsdfxj",
      },
    });

    const mailOptions = {
      from: "erhetbhavsar@gmail.com",
      to: customerDetails.email,
      subject: `🎉 Congratulations! Your Enrollment is Confirmed! Welcome to ${course.cname}!`,
      text: `Dear ${customerDetails.name},
    
    We are absolutely thrilled to welcome you to Garbhsanskar Guru! 🌟
    
    Your recent purchase of the "${course.cname}" course has been successfully processed, and we’re delighted to have you as part of our learning community. Here’s what you need to know about your purchase and what to expect next:
    
    🔑 Enrollment Details:
    - Course Name: ${course.cname}
    - Purchase Date: ${customerDetails.transactionDate}
    - Transaction ID: ${razorpayPaymentId}
    - Total Amount Paid: ₹${totalPaidAmount}
    - Invoice Number: ${invoiceNumber}
    
    📚 What Awaits You in "${course.cname}":
    
    Prepare yourself for a transformative journey! This course has been carefully crafted to provide you with the skills, knowledge, and insights that will take you to the next level. With expert instructors, immersive content, and hands-on exercises, you’re in for an educational experience like no other.
    
    ✨ Why You’re Going to Love This Course:
    
    1. Expert Guidance:  Learn from industry leaders and seasoned professionals who are passionate about sharing their expertise.
    2. Comprehensive Content: From foundational concepts to advanced strategies, this course covers it all.
    3. Interactive Learning: Engage with interactive modules, quizzes, and real-world projects that reinforce your learning.
    4. Flexible Schedule: Learn at your own pace, on your own schedule, with 24/7 access to course materials.
    5. Community Support: Join a vibrant community of learners and connect with like-minded individuals on the same journey.
    
    🚀 Next Steps:
    
    1. Access Your Course: You can start learning right away! Simply log in to your account on [Your Platform Link] and access your course under the “My Courses” section.
    2. Get Ready to Learn: Make sure you have a comfortable learning environment, a notebook for taking notes, and a readiness to absorb all the valuable information coming your way.
    3. Stay Connected: Don’t forget to join our community on [Social Media Links] where you can share your progress, ask questions, and stay updated with the latest news and resources.
    
    🎁 A Special Gift for You!
    
    As a token of our appreciation, we’re offering you an exclusive discount on your next course with us! Stay tuned for more details in your inbox.
    
    🔁 Need Assistance? We’re Here for You!
    
    If you have any questions, concerns, or just want to share your excitement, our support team is always here to help. Reach out to us at [Support Email] or [Support Phone Number], and we’ll be happy to assist you.
    
    Thank You for Choosing Us!
    
    At Garbhsanskar Guru, we are committed to your success. We believe that education is the most powerful tool you can use to achieve your dreams, and we are honored to be part of your journey. Your investment in learning is a step towards a brighter future, and we’re here to support you every step of the way.
    
    We can’t wait to see what you’ll achieve with the knowledge you’ll gain from "${course.cname}". Happy learning!
    
    Warm regards,
    
    [Your Full Name]
    [Your Position]
    Garbhsanskar Guru
    [Company Contact Information]
    `
    };    

    await transporter.sendMail(mailOptions);

    res.json({
      status: 200,
      success: true,
      message:
        "Payment verified, course purchased, and user enrolled successfully.",
    });
  } catch (error) {
    console.error("Error during payment verification:", error);
    res.json({
      status: 500,
      success: false,
      message: error.message,
    });
  }
};

const initiateRefund = async (purchaseId) => {
  try {
    const purchase = await CoursePurchase.findById(purchaseId);

    if (!purchase) {
      throw new Error("Purchase not found");
    }

    purchase.cancelBillNumber = `CNCL-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase()}`;

    purchase.active = false;

    const refund = await razorpay.payments.refund(purchase.transactionId, {
      amount: purchase.totalPaidAmount * 100,
      notes: {
        cancelBillNumber: purchase.cancelBillNumber,
      },
    });

    if (!refund) {
      throw new Error("Failed to initiate refund with Razorpay");
    }

    await purchase.save();

    return {
      success: true,
      message: "Refund initiated and cancel bill number generated.",
      cancelBillNumber: purchase.cancelBillNumber,
    };
  } catch (error) {
    console.error("Error initiating refund:", error);
    return {
      success: false,
      message: error.message,
    };
  }
};

const getAllCoursePurchases = async (req, res) => {
  try {
    const {
      search,
      page = 1,
      limit = 4,
      sortBy = "transactionDate",
      order = "desc",
    } = req.query;

    const query = {};
    
    if (search) {
      const regex = new RegExp(search, "i");

      // Check if the search term is a number (for mobileNumber and totalPaidAmount search)
      const searchNumber = !isNaN(search) ? Number(search) : null;

      query["$or"] = [
        { customerName: regex },          // Search by customer name
        { customerEmail: regex },         // Search by customer email
        { transactionId: regex },         // Search by transaction ID
        { invoiceNumber: regex },         // Search by invoice number
        ...(searchNumber !== null ? [{ mobileNumber: searchNumber }, { totalPaidAmount: searchNumber }] : []), // Search by mobile number and total paid amount if the search is a number
      ];
    }

    const sortOrder = order.toLowerCase() === "asc" ? 1 : -1;

    const totalPayments = await CoursePurchase.countDocuments(query);
    const pageCount = Math.ceil(totalPayments / limit);

    const payments = await CoursePurchase.find(query)
      // .populate("courseId", "cname")
      // .populate("userId", "name")
      // .populate("userId", "name")
      // .sort({ transactionDate: -1 })
      .sort({ [sortBy]: sortOrder })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .exec();

    res.json({
      // payments: CoursePurchase.map((payment) => ({
      //   ...payment._doc,
      //   userName: payment.userId.name,
      //   courseName: payment.courseId.cname,
      // })),
      payments: payments.map((payment) => ({
        ...payment._doc,
        userName: payment.userId.name,
        courseName: payment.courseId,
      })),
      page: parseInt(page),
      pageCount,
      totalPayments,
    });
  } catch (error) {
    console.error("Error fetching payments:", error);
    res.status(500).json({
      status: 500,
      message: error.message,
    });
  }
};

const deleteCoursePurchase = async (req, res) => {
  try {
    const { id } = req.params;
    await CoursePurchase.findByIdAndDelete(id);
    res.json({
      status: 200,
      message: "Transaction deleted successfully",
    });
  } catch (error) {
    res.json({
      status: 500,
      message: "Error deleting transaction",
      error: error.message,
    });
  }
};

const coursePurchasetoggleButton = async (req, res) => {
  console.log(
    `PATCH request received for course purchase ID: ${req.params.id}`
  );
  try {
    const coursePurchase = await CoursePurchase.findById(req.params.id);
    if (!coursePurchase) {
      return res.json({
        status: 404,
        message: "Purchased course not found",
      });
    }
    coursePurchase.active = !coursePurchase.active;
    await coursePurchase.save();
    res.json({
      status: 200,
      coursePurchase,
    });
  } catch (error) {
    console.error("Error toggling Purchased course:", error);
    res.json({
      status: 500,
      message: "Server error",
    });
  }
};

const getEnrolledCourses = async (req, res) => {
  try {
    const { userId } = req.params;

    // ValiDate the userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        status: 400,
        message: "Invalid user ID",
      });
    }

    // Find all enrollments for the user
    const enrollments = await Enrollment.find({ userId });

    if (enrollments.length === 0) {
      return res.status(404).json({
        status: 404,
        message: "No courses found for this user",
      });
    }

    // Extract courseIds from the enrollments
    const courseIds = enrollments.map(enrollment => enrollment.courseId);

    // Fetch course details
    const courses = await Course.find({ _id: { $in: courseIds } });

    return res.status(200).json({
      status: 200,
      data: courses,
    });
  } catch (error) {
    console.error("Error fetching enrolled courses:", error.message);
    return res.status(500).json({
      status: 500,
      message: "Failed to fetch enrolled courses",
    });
  }
};


module.exports = {
  createOrder,
  getOrderById,
  getallorders,
  editOrder,
  deleteOrder,
  verifyPayment,
  getAllCoursePurchases,
  coursePurchasetoggleButton,
  deleteCoursePurchase,
  initiateRefund,
  getEnrolledCourses
};
