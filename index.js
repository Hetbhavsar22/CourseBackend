const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const userModel = require("./Model/userModel");
const path = require("path");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const SECRET_KEY = process.env.SECRET_KEY;

const userRoutes = require("./route/userRoutes");
const courseRoutes = require("./route/courseRoutes");
const videoRoutes = require("./route/videoRoutes");

const app = express();
const PORT = process.env.PORT;
const dbString = process.env.DB_STRING;

// Middleware
app.use(express.json());
app.use(cors());

// MongoDB connection
mongoose
  .connect(dbString, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Connected to MongoDB");

    // Start server after MongoDB connection is established
    app.listen(PORT, () => {
      console.log(`Server started at port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
  });

// Use routes
app.use("/users", userRoutes);
app.use("/course", courseRoutes);
app.use("/video", videoRoutes);

// Additional route example
app.get("/getUserById", async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authorization token required" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decodedToken = jwt.verify(token, SECRET_KEY);
    const userId = decodedToken.id;

    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    const profileImagePath = user.profileImage
      ? path.join("/public/profile_images", user.profileImage)
      : null;

    res.json({
      ...user.toObject(),
      profileImage: profileImagePath,
    });
  } catch (err) {
    console.error("Error finding user:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});
