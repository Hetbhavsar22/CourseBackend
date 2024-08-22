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
    },
    password: {
      type: String,
    },
    profile_image: {
      type: String,
      default: "/images/default-avatar.jpg",
    },
    mobile_number: {
      type: Number,
      unique: true,
    },
    otp_number: {
      type: String,
      required: false,
    },
    otp_expire_time: {
      type: Date,
      required: false,
    },
  },
  { timestamps: true }
);

const adminModel = mongoose.model("admin", AdminSchema);
module.exports = adminModel;
