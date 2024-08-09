const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const adminModel = require("./Model/adminModel");
const userModel = require("./Model/userModel");
const path = require("path");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const SECRET_KEY = process.env.SECRET_KEY;

const adminRoutes = require("./route/adminRoutes");
const userRoutes = require("./route/userRoutes");
const courseRoutes = require("./route/courseRoutes");
const videoRoutes = require("./route/videoRoutes");

const app = express();
const PORT = process.env.PORT;
const dbString = process.env.DB_STRING;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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
app.use("/admin", adminRoutes);
app.use("/user", userRoutes);
app.use("/course", courseRoutes);
app.use("/video", videoRoutes);


app.use('/public', express.static(path.join(__dirname, 'public')));

// Additional route example
app.get("/getAdminById", async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authorization token required" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decodedToken = jwt.verify(token, SECRET_KEY);
    const adminId = decodedToken.id;

    const admin = await adminModel.findById(adminId);
    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }
    const profileImagePath = admin.profileImage
      ? path.join("/public/profile_images", admin.profileImage)
      : null;

    res.json({
      ...admin.toObject(),
      profileImage: profileImagePath,
    });
  } catch (err) {
    console.error("Error finding admin:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});
