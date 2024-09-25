const Tag = require("../../Model/tagModel");

const addTag = async (req, res) => {
  try {
    const { name } = req.body;
    const newTag = new Tag({ name });
    await newTag.save();
    res.json({
      status: 201,
      message: "Tag added successfully",
      tag: newTag,
    });
  } catch (error) {
    res.json({
      status: 500,
      message: "Error adding tag",
      error: error.message,
    });
  }
};

const getAllTags = async (req, res) => {
  try {
    const {
      search,
      // page = 1,
      // limit = 4,
      sortBy = "createdAt",
      order = "desc",
    } = req.query;

    const query = {};
    if (search) {
      query.name = new RegExp(search, "i");
    }

    const totalTag = await Tag.countDocuments(query);

    // Calculate the total number of pages
    // const pageCount = Math.ceil(totalTag / limit);

    const tags = await Tag.find(query).sort({
      [sortBy]: order === "asc" ? 1 : -1,
    });
    // .skip((page - 1) * limit)
    // .limit(parseInt(limit));

    res.json({
      status: 200,
      tags,
      // page: parseInt(page),
      // pageCount,
      totalTag,
    });
  } catch (error) {
    res.json({
      status: 500,
      message: "Error fetching tags",
      error: error.message,
    });
  }
};

const editTag = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const updatedTag = await Tag.findByIdAndUpdate(id, { name }, { new: true });
    res.json({
      status: 200,
      message: "Tag upDated successfully",
      tag: updatedTag,
    });
  } catch (error) {
    res.json({
      status: 500,
      message: "Error updating tag",
      error: error.message,
    });
  }
};

const deleteTag = async (req, res) => {
  try {
    const { id } = req.params;
    await Tag.findByIdAndDelete(id);
    res.json({
      status: 200,
      message: "Tag deleted successfully",
    });
  } catch (error) {
    res.json({
      status: 500,
      message: "Error deleting tag",
      error: error.message,
    });
  }
};

const tagtoggleButton = async (req, res) => {
  console.log(`PATCH request received for tag ID: ${req.params.id}`);
  try {
    const tag = await Tag.findById(req.params.id);
    if (!tag) {
      return res.json({
        status: 404,
        message: "Tag not found",
      });
    }
    tag.active = !tag.active;
    await tag.save();
    res.json({
      status: 200,
      tag,
    });
  } catch (error) {
    console.error("Error toggling course:", error);
    res.json({
      status: 500,
      message: "Server error",
    });
  }
};

module.exports = {
  addTag,
  getAllTags,
  editTag,
  deleteTag,
  tagtoggleButton,
};
