const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const Driver = require('../models/Driver');
const generateToken = require('../utils/generateToken');
const { sendPushNotification } = require('../utils/notifications');

// @desc    Register a student
// @route   POST /api/auth/student/register
// @access  Public
exports.registerStudent = async (req, res, next) => {
  try {
    console.log('Registration request received');
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, email, phone, password, registrationNumber, department } = req.body;
    
    // Normalize email once (validation already done by express-validator)
    const normalizedEmail = email.toLowerCase().trim();
    console.log('Checking for existing user:', normalizedEmail);

    // Check if user already exists (use lean() for faster query)
    const existingUser = await User.findOne({ email: normalizedEmail }).lean();
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    console.log('Hashing password...');
    // Hash password - use bcrypt.hash directly (it handles salt generation internally)
    // Using rounds=10 for good balance between security and speed
    const passwordHash = await bcrypt.hash(password, 10);
    console.log('Password hashed, creating user...');

    // Create user (use normalized email)
    const user = await User.create({
      name,
      email: normalizedEmail,
      phone,
      passwordHash,
      registrationNumber,
      department,
      role: 'student',
    });
    console.log('User created:', user._id);

    const token = generateToken(user._id, 'student');
    console.log('Token generated, sending response...');

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        registrationNumber: user.registrationNumber,
        department: user.department,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login a student
// @route   POST /api/auth/student/login
// @access  Public
exports.loginStudent = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password } = req.body;
    
    // Normalize email once
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user exists (email is already validated by frontend and express-validator)
    // IMPORTANT: Don't use .lean() here because we need passwordHash which has select: false
    // The +passwordHash syntax works with regular Mongoose queries, not with lean()
    const user = await User.findOne({ email: normalizedEmail })
      .select('+passwordHash name email phone role registrationNumber department');
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password - use consistent timing to prevent timing attacks
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user._id, 'student');

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        registrationNumber: user.registrationNumber,
        department: user.department,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Register a driver
// @route   POST /api/auth/driver/register
// @access  Public
exports.registerDriver = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, email, phone, password, vehicleModel, vehicleNumber, totalSeats } = req.body;
    
    // Normalize email once (validation already done by express-validator)
    const normalizedEmail = email.toLowerCase().trim();

    // Check if driver already exists (use lean() for faster query)
    const existingDriver = await Driver.findOne({ email: normalizedEmail }).lean();
    if (existingDriver) {
      return res.status(400).json({ message: 'Driver already exists with this email' });
    }

    // Hash password - use bcrypt.hash directly (it handles salt generation internally)
    const passwordHash = await bcrypt.hash(password, 10);

    // Create driver (use normalized email)
    const driver = await Driver.create({
      name,
      email: normalizedEmail,
      phone,
      passwordHash,
      vehicleModel,
      vehicleNumber,
      totalSeats,
      role: 'driver',
      verified: false,
    });

    const token = generateToken(driver._id, 'driver');

    res.status(201).json({
      success: true,
      token,
      driver: {
        id: driver._id,
        name: driver.name,
        email: driver.email,
        phone: driver.phone,
        role: driver.role,
        vehicleModel: driver.vehicleModel,
        vehicleNumber: driver.vehicleNumber,
        totalSeats: driver.totalSeats,
        verified: driver.verified,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login a driver
// @route   POST /api/auth/driver/login
// @access  Public
exports.loginDriver = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password } = req.body;
    
    // Normalize email once
    const normalizedEmail = email.toLowerCase().trim();

    // Check if driver exists (email is already validated by express-validator)
    // IMPORTANT: Don't use .lean() here because we need passwordHash which has select: false
    // The +passwordHash syntax works with regular Mongoose queries, not with lean()
    const driver = await Driver.findOne({ email: normalizedEmail })
      .select('+passwordHash name email phone role vehicleModel vehicleNumber totalSeats verified');
    
    if (!driver) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password - use consistent timing to prevent timing attacks
    const isMatch = await bcrypt.compare(password, driver.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(driver._id, 'driver');

    res.json({
      success: true,
      token,
      driver: {
        id: driver._id,
        name: driver.name,
        email: driver.email,
        phone: driver.phone,
        role: driver.role,
        vehicleModel: driver.vehicleModel,
        vehicleNumber: driver.vehicleNumber,
        totalSeats: driver.totalSeats,
        verified: driver.verified,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Save notification token for user/driver
// @route   PUT /api/auth/notification-token
// @access  Private
exports.saveNotificationToken = async (req, res, next) => {
  try {
    const { notificationToken } = req.body;

    if (!notificationToken) {
      return res.status(400).json({ message: 'Notification token is required' });
    }

    if (req.user.role === 'student') {
      await User.findByIdAndUpdate(req.user.id, { notificationToken });
    } else if (req.user.role === 'driver') {
      await Driver.findByIdAndUpdate(req.user.id, { notificationToken });
    } else {
      return res.status(400).json({ message: 'Invalid user role' });
    }

    res.json({
      success: true,
      message: 'Notification token saved successfully',
    });
  } catch (error) {
    next(error);
  }
};

