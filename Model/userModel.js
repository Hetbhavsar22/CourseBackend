const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const UserSchema = new Schema(
  {
    name: {
      type: String,
      require: true,
      unique: [true, "Name already exists in the database"],
    },

    email: {
      type: String
    },

    country_code: {
      type: Number,
    },

    // city: {
    //   type: String,
    // },

    phoneNumber: {
      type: Number,
    },

    // profile_image: {
    //   type: String,
    //   default: "/images/default-avatar.jpg",
    // },

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

    active: {
      type: Boolean,
      default: true,
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const userModel = mongoose.model("User", UserSchema);
module.exports = userModel;
