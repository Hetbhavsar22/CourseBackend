const mongoose = require("mongoose");
const Course = require("../../Model/courseModel");


// Validation rules
// const paymentValidationRules = [
//     body('courseId')
//     .isMongoId()
//     .withMessage('Invalid courseId format.'),

//   body('amount')
//     .isFloat({ gt: 0 })
//     .withMessage('Amount must be a positive number.'),

//     body('currency')
//     .isCurrency({ symbol: '', require_symbol: false, allow_negatives: false })
//     .withMessage('Invalid currency format.'),

//   body('userId')
//     .isMongoId()
//     .withMessage('Invalid userId format.'),
// ];

const payment = async (req, res) => {

    const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
//   try {
//     const { courseId, amount, userId, currency } = req.body;

//     if (!courseId) {
//       return res.status(400).json({ error: "Course ID is required" });
//     } else {
//         alert(courseId)
//     }

//     const payment = new Course({
//       courseId,
//     });

//     console.log(req.body);
//     const savedPayment = await payment.save();
//     res.status(200).json({ message: 'Course purchased successfully.' });
//   } catch (error) {
//     console.error("Error creating course:", error);
//     res.status(500).json({ error: "Failed to create course" });
//   }
};

module.exports = {
  payment,
};
