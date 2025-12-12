const Driver = require('../models/Driver');
const { sendPushNotification } = require('../utils/notifications');

// @desc    Get all drivers (for admin)
// @route   GET /api/drivers
// @access  Private (Admin only - or use secret key)
exports.getAllDrivers = async (req, res, next) => {
  try {
    const { verified, search } = req.query;
    
    const query = {};
    if (verified !== undefined) {
      query.verified = verified === 'true';
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { vehicleNumber: { $regex: search, $options: 'i' } },
      ];
    }

    const drivers = await Driver.find(query)
      .select('name email phone vehicleModel vehicleNumber totalSeats verified createdAt')
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      count: drivers.length,
      drivers,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get a single driver by ID
// @route   GET /api/drivers/:id
// @access  Private
exports.getDriverById = async (req, res, next) => {
  try {
    const driver = await Driver.findById(req.params.id)
      .select('name email phone vehicleModel vehicleNumber totalSeats verified documents createdAt')
      .lean();

    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    res.json({
      success: true,
      driver,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify a driver
// @route   PUT /api/drivers/:id/verify
// @access  Private (Admin only - protected by secret key)
exports.verifyDriver = async (req, res, next) => {
  try {
    const { adminSecret } = req.body;
    
    // Simple admin secret check (you can use environment variable)
    const ADMIN_SECRET = process.env.ADMIN_SECRET || 'schuttle-admin-2024';
    if (adminSecret !== ADMIN_SECRET) {
      return res.status(403).json({ message: 'Unauthorized. Invalid admin secret.' });
    }

    const driver = await Driver.findById(req.params.id);
    
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    if (driver.verified) {
      return res.status(400).json({ message: 'Driver is already verified' });
    }

    // Verify the driver
    driver.verified = true;
    await driver.save();

    // Send notification to driver
    if (driver.notificationToken) {
      sendPushNotification(
        driver.notificationToken,
        'Driver Verification Approved! 🎉',
        `Congratulations! Your driver account has been verified. You can now create rides.`,
        {
          type: 'driver_verified',
          driverId: driver._id.toString(),
        }
      ).catch((err) => console.error('Error sending verification notification:', err));
    }

    res.json({
      success: true,
      message: 'Driver verified successfully',
      driver: {
        id: driver._id,
        name: driver.name,
        email: driver.email,
        verified: driver.verified,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reject/Unverify a driver
// @route   PUT /api/drivers/:id/unverify
// @access  Private (Admin only - protected by secret key)
exports.unverifyDriver = async (req, res, next) => {
  try {
    const { adminSecret } = req.body;
    
    // Simple admin secret check
    const ADMIN_SECRET = process.env.ADMIN_SECRET || 'schuttle-admin-2024';
    if (adminSecret !== ADMIN_SECRET) {
      return res.status(403).json({ message: 'Unauthorized. Invalid admin secret.' });
    }

    const driver = await Driver.findById(req.params.id);
    
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    if (!driver.verified) {
      return res.status(400).json({ message: 'Driver is not verified' });
    }

    // Unverify the driver
    driver.verified = false;
    await driver.save();

    res.json({
      success: true,
      message: 'Driver verification removed successfully',
      driver: {
        id: driver._id,
        name: driver.name,
        email: driver.email,
        verified: driver.verified,
      },
    });
  } catch (error) {
    next(error);
  }
};

