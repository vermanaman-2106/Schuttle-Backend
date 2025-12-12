/**
 * Script to list all drivers and their verification status
 * 
 * Usage: node Backend/scripts/list-drivers.js [--unverified]
 * 
 * Example:
 *   node Backend/scripts/list-drivers.js
 *   node Backend/scripts/list-drivers.js --unverified
 */

require('dotenv').config({ path: './Backend/.env' });
const connectDB = require('../config/db');
const Driver = require('../models/Driver');

const listDrivers = async () => {
  await connectDB();

  try {
    const showOnlyUnverified = process.argv.includes('--unverified');

    const query = showOnlyUnverified ? { verified: false } : {};

    const drivers = await Driver.find(query)
      .select('name email phone vehicleModel vehicleNumber totalSeats verified createdAt')
      .sort({ createdAt: -1 })
      .lean();

    if (drivers.length === 0) {
      console.log(`\n${showOnlyUnverified ? '✅ No unverified drivers found!' : '📋 No drivers found.'}\n`);
      process.exit(0);
    }

    console.log(`\n📋 ${showOnlyUnverified ? 'Unverified' : 'All'} Drivers (${drivers.length})\n`);
    console.log('─'.repeat(100));

    drivers.forEach((driver, index) => {
      const status = driver.verified ? '✅ VERIFIED' : '⏳ PENDING';
      const statusColor = driver.verified ? '\x1b[32m' : '\x1b[33m';
      const resetColor = '\x1b[0m';

      console.log(`\n${index + 1}. ${driver.name}`);
      console.log(`   Email: ${driver.email}`);
      console.log(`   Phone: ${driver.phone}`);
      console.log(`   Vehicle: ${driver.vehicleModel} - ${driver.vehicleNumber}`);
      console.log(`   Seats: ${driver.totalSeats}`);
      console.log(`   Status: ${statusColor}${status}${resetColor}`);
      console.log(`   ID: ${driver._id}`);
      console.log(`   Created: ${new Date(driver.createdAt).toLocaleString()}`);
      console.log(`   Verify: node Backend/scripts/verify-driver.js ${driver.email}`);
    });

    console.log('\n' + '─'.repeat(100));
    console.log(`\n💡 To verify a driver, run:`);
    console.log(`   node Backend/scripts/verify-driver.js <email-or-id>\n`);
  } catch (error) {
    console.error('❌ Error listing drivers:', error.message);
    process.exit(1);
  } finally {
    process.exit(0);
  }
};

listDrivers();

