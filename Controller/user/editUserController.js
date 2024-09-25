const userModel = require("../../Model/userModel");

const editUser = async (req, res) => {
  const userId = req.body.editUserId;
  const { name, email, phoneNumber, active } = req.body;

  try {
    const upDatedUser = await userModel.findByIdAndUpDate(
      userId,
      { name, email, phoneNumber, active },
      { new: true, runValidators: true }
    );

    if (!upDatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "User upDated successfully", upDatedUser });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

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
