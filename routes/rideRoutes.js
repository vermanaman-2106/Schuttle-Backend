const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  createRide,
  getRides,
  getRideById,
  getDriverRides,
  updateRide,
  deleteRide,
  confirmRide,
} = require('../controllers/rideController');
const { authMiddleware, requireDriver } = require('../middleware/auth');

// Create ride validation
const createRideValidation = [
  body('pickupLocation').trim().notEmpty().withMessage('Pickup location is required'),
  body('dropLocation').trim().notEmpty().withMessage('Drop location is required'),
  body('date').notEmpty().withMessage('Date is required'),
  body('time').trim().notEmpty().withMessage('Time is required'),
  body('pricePerSeat').isFloat({ min: 0 }).withMessage('Price per seat must be a positive number'),
  body('totalSeats').isInt({ min: 1 }).withMessage('Total seats must be at least 1'),
];

// Public routes
router.get('/', getRides);

// Protected driver routes - specific routes must come before parameterized routes
router.post('/', authMiddleware, requireDriver, createRideValidation, createRide);
router.get('/driver/rides', authMiddleware, requireDriver, getDriverRides);

// Parameterized routes (must come after specific routes)
router.get('/:id', getRideById);
router.put('/:id', authMiddleware, requireDriver, updateRide);
router.put('/:id/confirm', authMiddleware, requireDriver, confirmRide);
router.delete('/:id', authMiddleware, requireDriver, deleteRide);

module.exports = router;

