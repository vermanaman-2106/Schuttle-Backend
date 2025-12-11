const { validationResult } = require('express-validator');
const Booking = require('../models/Booking');
const Ride = require('../models/Ride');
const User = require('../models/User');
const Driver = require('../models/Driver');
const { sendPushNotification } = require('../utils/notifications');

// @desc    Create a new booking
// @route   POST /api/bookings
// @access  Private (Student only)
exports.createBooking = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { rideId, seatsBooked } = req.body;

    // Validate seatsBooked
    if (!seatsBooked || seatsBooked < 1) {
      return res.status(400).json({ message: 'Must book at least 1 seat' });
    }

    // Find the ride and check availability atomically
    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({ message: 'Ride not found' });
    }

    // Check if ride is confirmed and open
    if (!ride.confirmed) {
      return res.status(400).json({ message: 'Ride is not confirmed yet. Please wait for driver confirmation.' });
    }
    
    if (ride.status !== 'open') {
      return res.status(400).json({ message: 'Ride is not available for booking' });
    }

    // Check available seats
    if (ride.availableSeats < seatsBooked) {
      return res.status(400).json({
        message: `Only ${ride.availableSeats} seat(s) available`,
      });
    }

    // Get driver info
    const driver = await Driver.findById(ride.driverId);
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    // Parse date and time to create rideDateTime
    // ride.date is a Date object from MongoDB, ride.time is a string like "10:00 AM"
    let rideDate;
    try {
      // Handle MongoDB date - could be Date object or string
      if (ride.date instanceof Date) {
        rideDate = ride.date;
      } else if (typeof ride.date === 'string') {
        rideDate = new Date(ride.date);
      } else {
        rideDate = new Date(ride.date);
      }
      
      if (isNaN(rideDate.getTime())) {
        console.error('Invalid ride date:', ride.date, typeof ride.date);
        return res.status(400).json({ message: 'Invalid ride date format' });
      }
    } catch (error) {
      console.error('Error parsing ride date:', error, ride.date);
      return res.status(400).json({ message: 'Invalid ride date format' });
    }
    
    // Get date components in local timezone
    const year = rideDate.getFullYear();
    const month = String(rideDate.getMonth() + 1).padStart(2, '0');
    const day = String(rideDate.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    // Convert time from "10:00 AM" format to "10:00" (24-hour format)
    let timeStr = ride.time ? String(ride.time).trim() : '';
    if (!timeStr) {
      console.error('Missing ride time:', ride.time);
      return res.status(400).json({ message: 'Ride time is required' });
    }
    
    // Remove AM/PM and convert to 24-hour format
    const isPM = timeStr.toUpperCase().includes('PM');
    const isAM = timeStr.toUpperCase().includes('AM');
    timeStr = timeStr.replace(/\s*(AM|PM|am|pm)/i, '').trim();
    
    const timeParts = timeStr.split(':');
    if (timeParts.length < 2) {
      console.error('Invalid time format:', ride.time, '->', timeStr);
      return res.status(400).json({ message: 'Invalid time format. Use HH:MM AM/PM' });
    }
    
    const hours = parseInt(timeParts[0], 10);
    const minutes = parseInt(timeParts[1] || '0', 10);
    
    if (isNaN(hours) || isNaN(minutes) || hours < 1 || hours > 12 || minutes < 0 || minutes > 59) {
      console.error('Invalid time values:', hours, minutes);
      return res.status(400).json({ message: 'Invalid time values. Hours must be 1-12, minutes 0-59' });
    }
    
    let hour24 = hours;
    if (isPM && hours !== 12) {
      hour24 = hours + 12;
    } else if (isAM && hours === 12) {
      hour24 = 0;
    }
    
    // Validate final 24-hour format
    if (hour24 < 0 || hour24 > 23) {
      console.error('Invalid hour24:', hour24);
      return res.status(400).json({ message: 'Invalid time conversion' });
    }
    
    // Create date directly from components to avoid timezone issues
    const rideDateTime = new Date(
      rideDate.getFullYear(),
      rideDate.getMonth(),
      rideDate.getDate(),
      hour24,
      minutes,
      0,
      0
    );
    
    if (isNaN(rideDateTime.getTime())) {
      console.error('Invalid date/time combination:', {
        year: rideDate.getFullYear(),
        month: rideDate.getMonth(),
        day: rideDate.getDate(),
        hour24,
        minutes,
        rideDate: ride.date,
        rideTime: ride.time
      });
      return res.status(400).json({ 
        message: `Invalid date/time combination` 
      });
    }
    
    console.log('Created rideDateTime:', rideDateTime.toISOString(), 'from date:', ride.date, 'time:', ride.time);

    // Atomically decrement available seats using $inc
    // This ensures no race conditions when multiple bookings happen simultaneously
    const updateQuery = {
      _id: rideId,
      availableSeats: { $gte: seatsBooked }, // Ensure enough seats available
      status: 'open', // Ensure ride is still open
    };

    const updateOperation = {
      $inc: { availableSeats: -seatsBooked }, // Atomically decrement seats
    };

    // Use findOneAndUpdate with condition to ensure atomicity
    const updatedRide = await Ride.findOneAndUpdate(
      updateQuery,
      updateOperation,
      {
        new: true, // Return updated document
        runValidators: true, // Run schema validators
      }
    );

    // If update failed, it means ride was modified or doesn't have enough seats
    if (!updatedRide) {
      // Re-fetch ride to get current available seats
      const currentRide = await Ride.findById(rideId);
      if (!currentRide) {
        return res.status(404).json({ message: 'Ride not found' });
      }
      if (currentRide.status !== 'open') {
        return res.status(400).json({ message: 'Ride is not available for booking' });
      }
      return res.status(400).json({
        message: `Booking failed. Only ${currentRide.availableSeats} seat(s) available now. Please try again.`,
      });
    }

    // Update status to 'full' if no seats left
    if (updatedRide.availableSeats === 0) {
      updatedRide.status = 'full';
      await updatedRide.save();
    }

    // Create booking after successful seat update
    // Status starts as 'pending' - driver needs to confirm
    const booking = await Booking.create({
      rideId: ride._id,
      studentId: req.user.id,
      driverId: ride.driverId,
      seatsBooked,
      pickupLocation: ride.pickupLocation,
      dropLocation: ride.dropLocation,
      rideDateTime,
      bookingStatus: 'pending', // Changed to pending - requires driver confirmation
      paymentStatus: 'pending',
    });

    // Populate booking with related data
    await booking.populate('studentId', 'name email phone notificationToken');
    await booking.populate('driverId', 'name phone vehicleModel vehicleNumber notificationToken');
    await booking.populate('rideId');

    // Send notification to driver about new booking
    if (booking.driverId && booking.driverId.notificationToken) {
      const studentName = booking.studentId.name || 'A student';
      sendPushNotification(
        booking.driverId.notificationToken,
        'New Booking Request',
        `${studentName} booked ${seatsBooked} seat(s) for your ride from ${ride.pickupLocation} to ${ride.dropLocation}`,
        {
          type: 'new_booking',
          bookingId: booking._id.toString(),
          rideId: ride._id.toString(),
        }
      ).catch((err) => console.error('Error sending notification to driver:', err));
    }

    res.status(201).json({
      success: true,
      booking,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get bookings for logged-in student
// @route   GET /api/bookings/me
// @access  Private (Student only)
exports.getMyBookings = async (req, res, next) => {
  try {
    // Disable caching for real-time booking data
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Optimized query with lean() and specific field selection
    const bookings = await Booking.find({ studentId: req.user.id })
      .select('seatsBooked pickupLocation dropLocation rideDateTime bookingStatus paymentStatus rideId driverId createdAt')
      .populate('rideId', 'pickupLocation dropLocation date time pricePerSeat totalSeats availableSeats status')
      .populate('driverId', 'name phone vehicleModel vehicleNumber')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Booking.countDocuments({ studentId: req.user.id });

    res.json({
      success: true,
      count: bookings.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      bookings,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get bookings for rides belonging to logged-in driver
// @route   GET /api/driver/bookings
// @access  Private (Driver only)
exports.getDriverBookings = async (req, res, next) => {
  try {
    // Disable caching for real-time booking data
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Find all rides by this driver (optimized with lean and select)
    const rides = await Ride.find({ driverId: req.user.id })
      .select('_id')
      .lean();
    const rideIds = rides.map((ride) => ride._id);

    if (rideIds.length === 0) {
      return res.json({
        success: true,
        count: 0,
        total: 0,
        page: 1,
        pages: 0,
        bookings: [],
      });
    }

    // Find all bookings for these rides (optimized with lean and select)
    const bookings = await Booking.find({ rideId: { $in: rideIds } })
      .select('seatsBooked pickupLocation dropLocation rideDateTime bookingStatus paymentStatus rideId studentId createdAt')
      .populate('rideId', 'pickupLocation dropLocation date time pricePerSeat totalSeats availableSeats status')
      .populate('studentId', 'name email phone registrationNumber')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Booking.countDocuments({ rideId: { $in: rideIds } });

    res.json({
      success: true,
      count: bookings.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      bookings,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel a booking
// @route   PUT /api/bookings/:id/cancel
// @access  Private (Student only)
exports.cancelBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check if student owns this booking
    if (booking.studentId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to cancel this booking' });
    }

    // Check if booking can be cancelled
    if (booking.bookingStatus === 'cancelled') {
      return res.status(400).json({ message: 'Booking is already cancelled' });
    }

    if (booking.bookingStatus === 'rejected' || booking.bookingStatus === 'completed') {
      return res.status(400).json({ message: 'Cannot cancel a rejected or completed booking' });
    }

    // Update booking status
    booking.bookingStatus = 'cancelled';
    await booking.save();

    // Atomically increment available seats in ride
    const ride = await Ride.findById(booking.rideId);
    if (ride) {
      // Use $inc for atomic increment
      await Ride.findByIdAndUpdate(
        booking.rideId,
        {
          $inc: { availableSeats: booking.seatsBooked }, // Atomically increment seats
        },
        { runValidators: true }
      );

      // Update status to 'open' if it was 'full' and now has seats
      if (ride.status === 'full') {
        const updatedRide = await Ride.findById(booking.rideId);
        if (updatedRide && updatedRide.availableSeats > 0) {
          updatedRide.status = 'open';
          await updatedRide.save();
        }
      }
    }

    await booking.populate('rideId');
    await booking.populate('studentId', 'name email phone registrationNumber');
    await booking.populate('driverId', 'name phone vehicleModel vehicleNumber notificationToken');

    // Send notification to driver about booking cancellation
    if (booking.driverId && booking.driverId.notificationToken) {
      const studentName = booking.studentId.name || 'A student';
      sendPushNotification(
        booking.driverId.notificationToken,
        'Booking Cancelled',
        `${studentName} cancelled their booking for ${booking.seatsBooked} seat(s) from ${booking.pickupLocation} to ${booking.dropLocation}`,
        {
          type: 'booking_cancelled',
          bookingId: booking._id.toString(),
          rideId: booking.rideId._id.toString(),
        }
      ).catch((err) => console.error('Error sending notification to driver:', err));
    }

    res.json({
      success: true,
      message: 'Booking cancelled successfully',
      booking,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Confirm a booking (Driver only)
// @route   PUT /api/bookings/:id/confirm
// @access  Private (Driver only)
exports.confirmBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('rideId');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check if driver owns the ride for this booking
    if (booking.driverId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to confirm this booking' });
    }

    // Check if booking can be confirmed
    if (booking.bookingStatus === 'confirmed') {
      return res.status(400).json({ message: 'Booking is already confirmed' });
    }

    if (booking.bookingStatus === 'cancelled' || booking.bookingStatus === 'rejected') {
      return res.status(400).json({ message: 'Cannot confirm a cancelled or rejected booking' });
    }

    // Update booking status to confirmed
    booking.bookingStatus = 'confirmed';
    await booking.save();

    // Populate booking with related data
    await booking.populate('studentId', 'name email phone registrationNumber notificationToken');
    await booking.populate('driverId', 'name phone vehicleModel vehicleNumber');
    await booking.populate('rideId');

    // Send notification to student about booking confirmation
    if (booking.studentId && booking.studentId.notificationToken) {
      const driverName = booking.driverId.name || 'Driver';
      sendPushNotification(
        booking.studentId.notificationToken,
        'Booking Confirmed! 🎉',
        `Your booking for ${booking.seatsBooked} seat(s) from ${booking.pickupLocation} to ${booking.dropLocation} has been confirmed by ${driverName}`,
        {
          type: 'booking_confirmed',
          bookingId: booking._id.toString(),
          rideId: booking.rideId._id.toString(),
        }
      ).catch((err) => console.error('Error sending notification to student:', err));
    }

    res.json({
      success: true,
      message: 'Booking confirmed successfully',
      booking,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reject a booking (Driver only)
// @route   PUT /api/bookings/:id/reject
// @access  Private (Driver only)
exports.rejectBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('rideId');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check if driver owns the ride for this booking
    if (booking.driverId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to reject this booking' });
    }

    // Check if booking can be rejected
    if (booking.bookingStatus === 'rejected') {
      return res.status(400).json({ message: 'Booking is already rejected' });
    }

    if (booking.bookingStatus === 'cancelled' || booking.bookingStatus === 'completed') {
      return res.status(400).json({ message: 'Cannot reject a cancelled or completed booking' });
    }

    // Store original status before updating
    const originalStatus = booking.bookingStatus;

    // Update booking status to rejected
    booking.bookingStatus = 'rejected';
    await booking.save();

    // If booking was pending or confirmed, return seats to the ride
    if (originalStatus === 'pending' || originalStatus === 'confirmed') {
      const ride = await Ride.findById(booking.rideId);
      if (ride) {
        // Atomically increment available seats
        await Ride.findByIdAndUpdate(
          booking.rideId,
          {
            $inc: { availableSeats: booking.seatsBooked },
          },
          { runValidators: true }
        );

        // Update status to 'open' if it was 'full' and now has seats
        if (ride.status === 'full') {
          const updatedRide = await Ride.findById(booking.rideId);
          if (updatedRide && updatedRide.availableSeats > 0) {
            updatedRide.status = 'open';
            await updatedRide.save();
          }
        }
      }
    }

    // Populate booking with related data
    await booking.populate('studentId', 'name email phone registrationNumber notificationToken');
    await booking.populate('driverId', 'name phone vehicleModel vehicleNumber');
    await booking.populate('rideId');

    // Send notification to student about booking rejection
    if (booking.studentId && booking.studentId.notificationToken) {
      const driverName = booking.driverId.name || 'Driver';
      sendPushNotification(
        booking.studentId.notificationToken,
        'Booking Rejected',
        `Your booking request for ${booking.seatsBooked} seat(s) from ${booking.pickupLocation} to ${booking.dropLocation} has been rejected by ${driverName}`,
        {
          type: 'booking_rejected',
          bookingId: booking._id.toString(),
          rideId: booking.rideId._id.toString(),
        }
      ).catch((err) => console.error('Error sending notification to student:', err));
    }

    res.json({
      success: true,
      message: 'Booking rejected successfully',
      booking,
    });
  } catch (error) {
    next(error);
  }
};

