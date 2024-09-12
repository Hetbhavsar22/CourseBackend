const jwt = require('jsonwebtoken');
const User = require('../Model/userModel');

const authenticate = async (req, res, next) => {
  try {
    // Retrieve the token from the Authorization header
    const token = req.header('Authorization').replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'No token provided. Please authenticate.' });
    }

    // Verify and decode the token
    const decoded = jwt.verify(token, process.env.SECRET_KEY);

    // Find the user associated with the decoded token's id
    const user = await User.findOne({ _id: decoded.id });
    if (!user) {
      return res.status(401).json({ message: 'User not found. Please authenticate.' });
    }

    // Attach the user and token to the request object
    req.token = token;
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Please authenticate.', error: error.message });
  }
};

module.exports = authenticate;
