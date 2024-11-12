const CoursePurchase = require("../../Model/coursePurchaseModel");
const Enrollment = require("../../Model/enrollmentModel");
const order_IdModel = require("../../Model/order_IdModel");
const Razorpay = require("razorpay");
require("dotenv").config();

const razorpayInstance = new Razorpay({
  key_id: "rzp_test_ijIfGspQLSfEhH",
  key_secret: "2BchtClGW9UJJd6HmHpa898i",
});

const checkRefundStatus = async (refundId) => {
  try {
    const refundDetails = await razorpayInstance.refunds.fetch(refundId);
    return refundDetails;
  } catch (error) {
    console.error("Error fetching refund status:", error);
    throw error;
  }
};

// Function to initiate a refund
const initiateRefund = async (req, res) => {
  const { transactionId } = req.params;
  const { refundAmount } = req.body;

  try {
    const purchase = await CoursePurchase.findOne({ transactionId }); // Find purchase by transactionId
    if (!purchase) {
      return res.status(404).json({ message: "Purchase not found" });
    }

    if (purchase.refundStatus) {
      return res.status(400).json({ message: "Refund already processed" });
    }

    // Check if the payment is captured
    const paymentDetails = await razorpayInstance.payments.fetch(
      purchase.transactionId
    );

    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
  
    const currentYearMonth = `${year}${month}`;
    const cancelPrefix = `CNC-${currentYearMonth}`;
  
    const refundCount = await CoursePurchase.countDocuments({
      cancelBillNumber: new RegExp(`^${cancelPrefix}`),
    });
  
    const cancelBillNumber = `${cancelPrefix}${String(refundCount + 1).padStart(
      2,
      "0"
    )}`;

    console.log("cancelBillNumber: ", cancelBillNumber);

    if (paymentDetails.status === "captured") {
      // Proceed with refund
      const refund = await razorpayInstance.payments.refund(
        purchase.transactionId,
        {
          amount: purchase.totalPaidAmount * 100,
          notes: {
            cancelBillNumber, // Pass it in notes as an object
          },
        }
      );

      if (!refund) {
        throw new Error("Failed to initiate refund with Razorpay");
      }

      console.log("cancelnumber: ", purchase.cancelBillNumber);
      // Store the refund ID in the purchase document
      purchase.refundId = refund.id; // Store the refund ID
      purchase.refundStatus = true;
      purchase.cancelBillNumber = cancelBillNumber;
      purchase.refundAmount = refundAmount;
      purchase.refundDate = new Date();
      
      // await Enrollment.findOne(
        //   { courseId: purchase.courseId, userId: purchase.userId }, // Filter to find the enrollment
        //   {
          //     active: false, // Set the course as inactive
          //     deactivatedAt: new Date(), // Log the deactivation time
          //   }
          // );
          
          console.log("Refund data before saving: ", {
            refundId: purchase.refundId,
            refundStatus: purchase.refundStatus,
            cancelBillNumber: purchase.cancelBillNumber,
            refundAmount: purchase.refundAmount,
            refundDate: purchase.refundDate,
          });
          await purchase.save();

      const order = await order_IdModel.findOne({ razorpayOrderId });

      order.refunded = true;
      await order.save();

      // Check the refund status after initiating
      const refundStatus = await checkRefundStatus(refund.id);
      if (refundStatus.status === "processed") {
        // Notify user about the successful refund
        console.log("Refund processed successfully. Notify the user.");
      } else {
        // Handle pending or failed status
        console.log("Refund is pending or failed. Handle accordingly.");
        // Optionally, you can implement a retry mechanism here
        setTimeout(async () => {
          const updatedRefundStatus = await checkRefundStatus(refund.id);
          if (updatedRefundStatus.status === "processed") {
            console.log("Refund processed successfully after checking again.");
            // Notify user about the successful refund
          } else {
            console.log("Refund still pending or failed after retry.");
            // Handle the pending or failed refund case
          }
        }, 30000); // Check again after 30 seconds
      }

      res.status(200).json({
        success: true,
        message: "Refund initiated successfully",
        refundDetails: refund,
      });
    } else {
      // If payment is not captured, capture it first
      const captureResponse = await razorpayInstance.payments.capture(
        purchase.transactionId,
        purchase.totalPaidAmount * 100
      );
      if (captureResponse) {
        // Now that the payment is captured, proceed with the refund
        const refund = await razorpayInstance.payments.refund(
          purchase.transactionId,
          {
            amount: purchase.totalPaidAmount * 100,
            cancelBillNumber,
          }
        );

        if (!refund) {
          throw new Error("Failed to initiate refund with Razorpay");
        }

        // Store the refund ID in the purchase document
        purchase.refundId = refund.id; // Store the refund ID
        purchase.refundStatus = true;
        purchase.cancelBillNumber = cancelBillNumber;
        purchase.refundAmount = refundAmount;
        purchase.refundDate = new Date();
        await purchase.save();

        // Check the refund status after initiating
        const refundStatus = await checkRefundStatus(refund.id);
        if (refundStatus.status === "processed") {
          // Notify user about the successful refund
          console.log("Refund processed successfully. Notify the user.");
        } else {
          // Handle pending or failed status
          console.log("Refund is pending or failed. Handle accordingly.");
          // Optionally, implement a retry mechanism here
          setTimeout(async () => {
            const updatedRefundStatus = await checkRefundStatus(refund.id);
            if (updatedRefundStatus.status === "processed") {
              console.log(
                "Refund processed successfully after checking again."
              );
              // Notify user about the successful refund
            } else {
              console.log("Refund still pending or failed after retry.");
              // Handle the pending or failed refund case
            }
          }, 30000); // Check again after 30 seconds
        }

        res.status(200).json({
          success: true,
          message: "Refund initiated successfully after capturing payment",
          refundDetails: refund,
        });
      } else {
        return res
          .status(400)
          .json({ message: "Failed to capture payment before refunding" });
      }
    }
  } catch (error) {
    console.error("Error initiating refund:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getAllRefunds = async (req, res) => {
  try {
    const {
      search,
      page,
      limit,
      sortBy = "refundDate",
      order = "desc",
      courseName,
      customerName,
      refundId,
      cancelBillNumber,
      pageCount,
      refundStatusField = "refundStatus",
    } = req.query;

    const query = {
      [refundStatusField]: true,
    };

    // Fetch all purchases with refund details
    const purchases = await CoursePurchase.find({
      refundStatus: true,
    }).populate("courseId userId", "courseName customerName"); // Populate course and user details if needed

    if (search) {
      query.$or = [
        { courseName: new RegExp(search, "i") },
        { customerName: new RegExp(search, "i") },
        { refundId: new RegExp(search, "i") },
        { cancelBillNumber: new RegExp(search, "i") },
      ];
    }

    if (courseName) {
      query.courseName = new RegExp(courseName, "i");
    }
    if (customerName) {
      query.customerName = customerName;
    }
    if (refundId) {
      query.refundId = refundId;
    }
    if (cancelBillNumber) {
      query.cancelBillNumber = cancelBillNumber;
    }

    const sortOrder = order.toLowerCase() === "asc" ? 1 : -1;

    const totalrefunds = await CoursePurchase.countDocuments(query);

    const refunds = await CoursePurchase.find(query)
      .sort({ [sortBy]: sortOrder })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    // Prepare the response data
    const responseData = refunds.map((refund) => ({
      transactionId: refund.transactionId,
      refundId: refund.refundId,
      refundDate: refund.updatedAt, // Assuming the refund date is the updated date of the purchase
      courseName: refund.courseName,
      customerName: refund.customerName,
      customerEmail: refund.customerEmail,
      mobileNumber: refund.mobileNumber,
      totalPaidAmount: refund.totalPaidAmount,
      cancelBillNumber: refund.cancelBillNumber,
      discountCode: refund.discountCode || null,
    }));

    res.status(200).json({
      success: true,
      message: "All refund details retrieved successfully",
      data: responseData,
      page: parseInt(page),
      pageCount,
      totalrefunds,
    });
  } catch (error) {
    console.error("Error fetching all refund details:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  initiateRefund,
  getAllRefunds,
};
