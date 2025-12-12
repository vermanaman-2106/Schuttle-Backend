/**
 * Script to verify a driver manually
 * 
 * Usage: node Backend/scripts/verify-driver.js <driver-email-or-id>
 * 
 * Example:
 *   node Backend/scripts/verify-driver.js driver@example.com
 *   node Backend/scripts/verify-driver.js 507f1f77bcf86cd799439011
 */

require('dotenv').config({ path: './Backend/.env' });
const connectDB = require('../config/db');
const Driver = require('../models/Driver');
const { sendPushNotification } = require('../utils/notifications');

const verifyDriver = async () => {
  await connectDB();

  try {
    const driverIdentifier = process.argv[2];

    if (!driverIdentifier) {
      console.error('❌ Error: Please provide a driver email or ID');
      console.log('\nUsage: node Backend/scripts/verify-driver.js <driver-email-or-id>');
      console.log('\nExample:');
      console.log('  node Backend/scripts/verify-driver.js driver@example.com');
      console.log('  node Backend/scripts/verify-driver.js 507f1f77bcf86cd799439011');
      process.exit(1);
    }

    console.log(`\n🔍 Looking for driver: ${driverIdentifier}\n`);

    // Try to find by email first, then by ID
    let driver = await Driver.findOne({
      $or: [
        { email: driverIdentifier.toLowerCase().trim() },
        { _id: driverIdentifier },
      ],
    });

    if (!driver) {
      console.error(`❌ Driver not found: ${driverIdentifier}`);
      console.log('\n💡 Tip: Make sure the email or ID is correct.');
      process.exit(1);
    }

    if (driver.verified) {
      console.log(`✅ Driver "${driver.name}" (${driver.email}) is already verified.`);
      console.log(`   Vehicle: ${driver.vehicleModel} - ${driver.vehicleNumber}`);
      process.exit(0);
    }

    // Verify the driver
    driver.verified = true;
    await driver.save();

    console.log(`\n✅ Driver verified successfully!\n`);
    console.log(`   Name: ${driver.name}`);
    console.log(`   Email: ${driver.email}`);
    console.log(`   Phone: ${driver.phone}`);
    console.log(`   Vehicle: ${driver.vehicleModel} - ${driver.vehicleNumber}`);
    console.log(`   Total Seats: ${driver.totalSeats}`);
    console.log(`   Verified: ${driver.verified}\n`);

    // Send notification to driver if they have a token
    if (driver.notificationToken) {
      try {
        await sendPushNotification(
          driver.notificationToken,
          'Driver Verification Approved! 🎉',
          `Congratulations! Your driver account has been verified. You can now create rides.`,
          {
            type: 'driver_verified',
            driverId: driver._id.toString(),
          }
        );
        console.log('📱 Push notification sent to driver.\n');
      } catch (error) {
        console.log('⚠️  Could not send push notification (driver may not have token).\n');
      }
    } else {
      console.log('📱 No push notification token found for driver.\n');
    }

    console.log('✅ Done!');
  } catch (error) {
    console.error('❌ Error verifying driver:', error.message);
    process.exit(1);
  } finally {
    process.exit(0);
  }
};

verifyDriver();

