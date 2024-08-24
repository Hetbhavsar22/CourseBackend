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
      type: String,
    },

    phoneNumber: {
      type: Number,
    },

    otp: {
      type: String,
    },

    enrolledCourse: {
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
