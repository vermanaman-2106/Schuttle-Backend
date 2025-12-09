const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
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
      validate: {
        validator: function (email) {
          return email.endsWith('@muj.manipal.edu') || email.endsWith('@jaipur.manipal.edu');
        },
        message: 'Email must be a valid MUJ email (@muj.manipal.edu or @jaipur.manipal.edu)',
      },
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
      default: 'student',
      enum: ['student', 'admin'],
    },
    department: {
      type: String,
      trim: true,
    },
    registrationNumber: {
      type: String,
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
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  return obj;
};

module.exports = mongoose.model('User', userSchema);

