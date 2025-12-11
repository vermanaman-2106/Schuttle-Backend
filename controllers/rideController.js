const { validationResult } = require('express-validator');
const Ride = require('../models/Ride');
const Driver = require('../models/Driver');
const Booking = require('../models/Booking');

// @desc    Create a new ride
// @route   POST /api/rides
// @access  Private (Driver only)
exports.createRide = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { pickupLocation, dropLocation, date, time, pricePerSeat, totalSeats } = req.body;

    // Create ride (initially pending confirmation)
    const ride = await Ride.create({
      driverId: req.user.id,
      pickupLocation,
      dropLocation,
      date: new Date(date),
      time,
      pricePerSeat,
      totalSeats,
      availableSeats: totalSeats,
      status: 'pending',
      confirmed: false,
    });

    // Populate driver info
    await ride.populate('driverId', 'name phone vehicleModel vehicleNumber');

    res.status(201).json({
      success: true,
      ride,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all rides (with optional filters)
// @route   GET /api/rides
// @access  Public
exports.getRides = async (req, res, next) => {
  try {
    const { date, pickupLocation, dropLocation } = req.query;

    // Build query - only show confirmed and open rides to students
    const query = { status: 'open', confirmed: true };

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      query.date = { $gte: startOfDay, $lte: endOfDay };
    }

    if (pickupLocation) {
      query.pickupLocation = { $regex: pickupLocation, $options: 'i' };
    }

    if (dropLocation) {
      query.dropLocation = { $regex: dropLocation, $options: 'i' };
    }

    // Only show rides with available seats
    query.availableSeats = { $gt: 0 };

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Optimized query with lean() for faster performance
    const rides = await Ride.find(query)
      .select('pickupLocation dropLocation date time pricePerSeat totalSeats availableSeats status confirmed driverId createdAt')
      .populate('driverId', 'name phone vehicleModel vehicleNumber verified')
      .sort({ date: 1, time: 1 })
      .skip(skip)
      .limit(limit)
      .lean(); // Use lean() for read-only queries (faster, returns plain JS objects)

    // Get total count for pagination
    const total = await Ride.countDocuments(query);

    res.json({
      success: true,
      count: rides.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      rides,
    });

    res.json({
      success: true,
      count: rides.length,
      rides,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get a single ride by ID
// @route   GET /api/rides/:id
// @access  Public
exports.getRideById = async (req, res, next) => {
  try {
    const ride = await Ride.findById(req.params.id)
      .select('pickupLocation dropLocation date time pricePerSeat totalSeats availableSeats status confirmed driverId createdAt')
      .populate('driverId', 'name phone vehicleModel vehicleNumber verified')
      .lean();

    if (!ride) {
      return res.status(404).json({ message: 'Ride not found' });
    }

    res.json({
      success: true,
      ride,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get rides created by logged-in driver
// @route   GET /api/driver/rides
// @access  Private (Driver only)
exports.getDriverRides = async (req, res, next) => {
  try {
    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Optimized query with lean() and specific field selection
    const rides = await Ride.find({ driverId: req.user.id })
      .select('pickupLocation dropLocation date time pricePerSeat totalSeats availableSeats status confirmed createdAt updatedAt')
      .populate('driverId', 'name phone vehicleModel vehicleNumber')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Ride.countDocuments({ driverId: req.user.id });

    res.json({
      success: true,
      count: rides.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      rides,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Confirm a ride (Driver only)
// @route   PUT /api/rides/:id/confirm
// @access  Private (Driver only)
exports.confirmRide = async (req, res, next) => {
  try {
    const ride = await Ride.findById(req.params.id);

    if (!ride) {
      return res.status(404).json({ message: 'Ride not found' });
    }

    // Check if the logged-in driver owns this ride
    if (ride.driverId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to confirm this ride' });
    }

    // Check if ride is already confirmed
    if (ride.confirmed && ride.status === 'open') {
      return res.status(400).json({ message: 'Ride is already confirmed' });
    }

    // Confirm the ride and set status to open
    ride.confirmed = true;
    ride.status = 'open';
    await ride.save();

    await ride.populate('driverId', 'name phone vehicleModel vehicleNumber verified');

    res.json({
      success: true,
      message: 'Ride confirmed successfully',
      ride,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update ride status (e.g., cancel)
// @route   PUT /api/rides/:id
// @access  Private (Driver only)
exports.updateRide = async (req, res, next) => {
  try {
    const ride = await Ride.findById(req.params.id);

    if (!ride) {
      return res.status(404).json({ message: 'Ride not found' });
    }

    // Check if driver owns this ride
    if (ride.driverId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to update this ride' });
    }

    // Update allowed fields
    if (req.body.status) {
      ride.status = req.body.status;
    }

    const updatedRide = await ride.save();
    await updatedRide.populate('driverId', 'name phone vehicleModel vehicleNumber');

    res.json({
      success: true,
      ride: updatedRide,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a ride
// @route   DELETE /api/rides/:id
// @access  Private (Driver only)
exports.deleteRide = async (req, res, next) => {
  try {
    console.log('Delete ride request:', req.params.id, 'by driver:', req.user.id);
    
    const ride = await Ride.findById(req.params.id);

    if (!ride) {
      console.log('Ride not found:', req.params.id);
      return res.status(404).json({ message: 'Ride not found' });
    }

    // Check if driver owns this ride
    if (ride.driverId.toString() !== req.user.id) {
      console.log('Unauthorized delete attempt. Ride driver:', ride.driverId, 'Requesting driver:', req.user.id);
      return res.status(403).json({ message: 'Not authorized to delete this ride' });
    }

    // Check if there are any confirmed bookings
    const confirmedBookings = await Booking.countDocuments({
      rideId: ride._id,
      bookingStatus: 'confirmed',
    });

    if (confirmedBookings > 0) {
      return res.status(400).json({
        message: `Cannot delete ride. There are ${confirmedBookings} confirmed booking(s). Please cancel the ride instead.`,
      });
    }

    // Cancel any pending bookings
    await Booking.updateMany(
      { rideId: ride._id, bookingStatus: { $ne: 'cancelled' } },
      { bookingStatus: 'cancelled' }
    );

    // Delete the ride
    await Ride.findByIdAndDelete(req.params.id);

    console.log('Ride deleted successfully:', req.params.id);

    res.json({
      success: true,
      message: 'Ride deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting ride:', error);
    next(error);
  }
};

