const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const AdminSchema = new Schema(
  {
    adminId: {
      type: Schema.Types.ObjectId,
      ref: "Admin",
    },
    name: {
      type: String,
    },
    email: {
      type: String,
      unique: true,
      unique: true,
    },
    password: {
      type: String,
    },
    cointry_code: {
      type: Number,
    },
    mobile_number: {
      type: Number,
      unique: true,
    },
    profile_image: {
      type: String,
      default: "/images/default-avatar.jpg",
    },
    otp: {
      type: String,
    },
    otp_expire_time: {
      type: Date,
      default: null,
    },
    last_Browser_finger_print: {
      type: String,
    },
    login_expire_time: {
      type: Number,
      default: null,
    },
    verification_token: {
      type: String,
    },
  },
  { timestamps: true }
);

const adminModel = mongoose.model("admin", AdminSchema);
module.exports = adminModel;