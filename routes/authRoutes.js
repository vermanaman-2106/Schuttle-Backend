const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  registerStudent,
  loginStudent,
  registerDriver,
  loginDriver,
} = require('../controllers/authController');

// Student registration validation
const studentRegisterValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .custom((value) => {
      if (!value.endsWith('@muj.manipal.edu') && !value.endsWith('@jaipur.manipal.edu')) {
        throw new Error('Email must be a valid MUJ email (@muj.manipal.edu or @jaipur.manipal.edu)');
      }
      return true;
    }),
  body('phone').trim().notEmpty().withMessage('Phone number is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('registrationNumber').optional().trim(),
  body('department').optional().trim(),
];

// Student login validation
const studentLoginValidation = [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
];

// Driver registration validation
const driverRegisterValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('phone').trim().notEmpty().withMessage('Phone number is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('vehicleModel').trim().notEmpty().withMessage('Vehicle model is required'),
  body('vehicleNumber').trim().notEmpty().withMessage('Vehicle number is required'),
  body('totalSeats').isInt({ min: 1 }).withMessage('Total seats must be at least 1'),
];

// Driver login validation
const driverLoginValidation = [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
];

// Student routes
router.post('/student/register', studentRegisterValidation, registerStudent);
router.post('/student/login', studentLoginValidation, loginStudent);

// Driver routes
router.post('/driver/register', driverRegisterValidation, registerDriver);
router.post('/driver/login', driverLoginValidation, loginDriver);

module.exports = router;

