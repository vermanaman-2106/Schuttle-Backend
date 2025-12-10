const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    passwordHash: {
      type: String,
      required: [true, 'Password is required'],
      select: false, // Don't include in queries by default, must explicitly select
    },
    role: {
      type: String,
      default: 'driver',
      enum: ['driver'],
    },
    vehicleModel: {
      type: String,
      required: [true, 'Vehicle model is required'],
      trim: true,
    },
    vehicleNumber: {
      type: String,
      required: [true, 'Vehicle number is required'],
      trim: true,
      uppercase: true,
    },
    totalSeats: {
      type: Number,
      required: [true, 'Total seats is required'],
      min: [1, 'Total seats must be at least 1'],
    },
    verified: {
      type: Boolean,
      default: false,
    },
    documents: {
      licensePhotoUrl: {
        type: String,
        default: '',
      },
      rcPhotoUrl: {
        type: String,
        default: '',
      },
    },
    notificationToken: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Email already has unique: true which creates an index automatically
// No need to create duplicate index

// Remove passwordHash from JSON output
driverSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  return obj;
};

// Use 'Driver User' collection name to match your database
module.exports = mongoose.model('Driver', driverSchema, 'Driver User');

