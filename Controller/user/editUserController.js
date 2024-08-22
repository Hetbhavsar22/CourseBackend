const userModel = require("../../Model/userModel"); // Adjust the path as needed

// Edit User Details
const editUser = async (req, res) => {
  const userId = req.body.editUserId;
  const { name, email, phoneNumber, enrolledCourse, active } = req.body;

  try {
    // Find the user by ID and update with the new details
    const updatedUser = await userModel.findByIdAndUpdate(
      userId,
      { name, email, phoneNumber, enrolledCourse, active },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "User updated successfully", updatedUser });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete User
const deleteUser = async (req, res) => {
  
  try {
      const deletedUser = await userModel.findByIdAndDelete(req.params.id);

    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = { editUser, deleteUser };
