const mongoose = require('mongoose');

const rideSchema = new mongoose.Schema(
  {
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Driver',
      required: [true, 'Driver ID is required'],
    },
    pickupLocation: {
      type: String,
      required: [true, 'Pickup location is required'],
      trim: true,
    },
    dropLocation: {
      type: String,
      required: [true, 'Drop location is required'],
      trim: true,
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
    },
    time: {
      type: String,
      required: [true, 'Time is required'],
    },
    pricePerSeat: {
      type: Number,
      required: [true, 'Price per seat is required'],
      min: [0, 'Price cannot be negative'],
    },
    totalSeats: {
      type: Number,
      required: [true, 'Total seats is required'],
      min: [1, 'Total seats must be at least 1'],
    },
    availableSeats: {
      type: Number,
      required: true,
      min: [0, 'Available seats cannot be negative'],
    },
    status: {
      type: String,
      enum: ['pending', 'open', 'full', 'cancelled', 'completed'],
      default: 'pending',
    },
    confirmed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
rideSchema.index({ driverId: 1, createdAt: -1 });
rideSchema.index({ status: 1, date: 1 });
rideSchema.index({ confirmed: 1, status: 1, availableSeats: 1 }); // For getRides query
rideSchema.index({ date: 1, status: 1, confirmed: 1 }); // Composite index for common queries
rideSchema.index({ pickupLocation: 'text', dropLocation: 'text' }); // Text search index

// Use 'Rides' collection name to match your database
module.exports = mongoose.model('Ride', rideSchema, 'Rides');

