const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const UserSchema = new Schema(
  {
    profileImage: {
      type: String,
      default: "/images/default-avatar.jpg",
    },

    name: {
      type: String,
      require: true,
      unique: [true, "Name already exists in the database"],
    },

    email: {
      type: String,
    },

    password: {
      type: String,
    },

    currentPassword: {
      type: String,
    },

    newPassword: {
      type: String,
    },
  },
  { timestamps: true }
);

const userModel = mongoose.model("users", UserSchema);
module.exports = userModel;
