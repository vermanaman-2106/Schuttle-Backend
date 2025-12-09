const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  createBooking,
  getMyBookings,
  getDriverBookings,
  cancelBooking,
  confirmBooking,
  rejectBooking,
} = require('../controllers/bookingController');
const { authMiddleware, requireStudent, requireDriver } = require('../middleware/auth');

// Create booking validation
const createBookingValidation = [
  body('rideId').notEmpty().withMessage('Ride ID is required'),
  body('seatsBooked').isInt({ min: 1 }).withMessage('Seats booked must be at least 1'),
];

// Student routes
router.post('/', authMiddleware, requireStudent, createBookingValidation, createBooking);
router.get('/me', authMiddleware, requireStudent, getMyBookings);
router.put('/:id/cancel', authMiddleware, requireStudent, cancelBooking);

// Driver routes
router.get('/driver', authMiddleware, requireDriver, getDriverBookings);
router.put('/:id/confirm', authMiddleware, requireDriver, confirmBooking);
router.put('/:id/reject', authMiddleware, requireDriver, rejectBooking);

module.exports = router;

