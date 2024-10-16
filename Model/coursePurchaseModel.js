const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const coursePurchaseSchema = new Schema(
  {
    courseId: {
      type: Schema.Types.ObjectId,
      ref: "CourseList",
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    transactionDate: {
      type: Date,
      default: Date.now,
    },
    transactionId: {
      type: String,
      unique: true,
      required: true,
    },
    customerName: {
      type: String,
    },
    courseName: {
      type: String,
      ref: "CourseList",
    },
    customerEmail: {
      type: String,
      match: [/.+\@.+\..+/, "Please enter a valid email address"],
    },
    mobileNumber: {
      type: Number,
      match: [/^\d{10}$/, "Please enter a valid 10-digit mobile number"],
    },
    customerCity: {
      type: String,
    },
    currency: {
      type: String,
      default: "INR",
    },
    amountWithoutGst: {
      type: Number,
    },
    igst: {
      type: Number,
      default: 0,
    },
    cgst: {
      type: Number,
      default: 0,
    },
    sgst: {
      type: Number,
      default: 0,
    },
    totalGst: {
      type: Number,
      default: function () {
        return this.cgst + this.sgst;
      },
    },
    totalPaidAmount: {
      type: Number,
    },
    paymentMode: {
      type: String,
      enum: [
        "Credit Card",
        "Debit Card",
        "Net Banking",
        "UPI",
        "Wallet",
        "Cash",
      ],
    },
    invoiceNumber: {
      type: String,
      unique: true,
    },
    cancelBillNumber: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const CoursePurchase = mongoose.model(
  "CoursePurchaseList",
  coursePurchaseSchema
);

module.exports = CoursePurchase;
