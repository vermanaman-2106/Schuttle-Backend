const express = require('express');
const router = express.Router();
const {
  getAllDrivers,
  getDriverById,
  verifyDriver,
  unverifyDriver,
} = require('../controllers/driverController');

// Get all drivers (with optional filters)
router.get('/', getAllDrivers);

// Get single driver by ID
router.get('/:id', getDriverById);

// Verify a driver (requires admin secret)
router.put('/:id/verify', verifyDriver);

// Unverify a driver (requires admin secret)
router.put('/:id/unverify', unverifyDriver);

module.exports = router;

