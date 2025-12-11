const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    rideId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ride',
      required: [true, 'Ride ID is required'],
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student ID is required'],
    },
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Driver',
      required: [true, 'Driver ID is required'],
    },
    seatsBooked: {
      type: Number,
      required: [true, 'Number of seats booked is required'],
      min: [1, 'Must book at least 1 seat'],
    },
    pickupLocation: {
      type: String,
      required: true,
    },
    dropLocation: {
      type: String,
      required: true,
    },
    rideDateTime: {
      type: Date,
      required: true,
    },
    bookingStatus: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'completed', 'rejected'],
      default: 'pending',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
bookingSchema.index({ studentId: 1, createdAt: -1 });
bookingSchema.index({ driverId: 1, createdAt: -1 });
bookingSchema.index({ rideId: 1 });
bookingSchema.index({ bookingStatus: 1, createdAt: -1 }); // For filtering by status
bookingSchema.index({ rideId: 1, bookingStatus: 1 }); // Composite for ride bookings

module.exports = mongoose.model('Booking', bookingSchema);

