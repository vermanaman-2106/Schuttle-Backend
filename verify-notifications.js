/**
 * Verification script to check notification setup
 * 
 * Usage: node verify-notifications.js
 * 
 * This script checks:
 * 1. If notification utility exists
 * 2. If models have notificationToken field
 * 3. If users/drivers have tokens saved
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Driver = require('./models/Driver');

async function verifySetup() {
  console.log('🔍 Verifying Notification Setup...\n');

  // 1. Check if notification utility exists
  try {
    const { sendPushNotification } = require('./utils/notifications');
    console.log('✅ Notification utility found');
  } catch (error) {
    console.log('❌ Notification utility not found:', error.message);
    return;
  }

  // 2. Connect to database
  try {
    if (!process.env.MONGO_URI) {
      console.log('❌ MONGO_URI not found in .env file');
      return;
    }
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to database');
  } catch (error) {
    console.log('❌ Database connection failed:', error.message);
    return;
  }

  // 3. Check if models have notificationToken field
  try {
    const userSchema = User.schema.paths;
    const driverSchema = Driver.schema.paths;
    
    if (userSchema.notificationToken) {
      console.log('✅ User model has notificationToken field');
    } else {
      console.log('❌ User model missing notificationToken field');
    }

    if (driverSchema.notificationToken) {
      console.log('✅ Driver model has notificationToken field');
    } else {
      console.log('❌ Driver model missing notificationToken field');
    }
  } catch (error) {
    console.log('❌ Error checking models:', error.message);
  }

  // 4. Check for users with tokens
  try {
    const usersWithTokens = await User.countDocuments({ 
      notificationToken: { $exists: true, $ne: '' } 
    });
    console.log(`\n📊 Statistics:`);
    console.log(`   Users with notification tokens: ${usersWithTokens}`);
    
    if (usersWithTokens > 0) {
      const sampleUser = await User.findOne({ 
        notificationToken: { $exists: true, $ne: '' } 
      }).select('name email notificationToken');
      console.log(`\n   Sample user with token:`);
      console.log(`   - Name: ${sampleUser.name}`);
      console.log(`   - Email: ${sampleUser.email}`);
      console.log(`   - Token: ${sampleUser.notificationToken.substring(0, 30)}...`);
    }
  } catch (error) {
    console.log('❌ Error checking users:', error.message);
  }

  // 5. Check for drivers with tokens
  try {
    const driversWithTokens = await Driver.countDocuments({ 
      notificationToken: { $exists: true, $ne: '' } 
    });
    console.log(`   Drivers with notification tokens: ${driversWithTokens}`);
    
    if (driversWithTokens > 0) {
      const sampleDriver = await Driver.findOne({ 
        notificationToken: { $exists: true, $ne: '' } 
      }).select('name email notificationToken');
      console.log(`\n   Sample driver with token:`);
      console.log(`   - Name: ${sampleDriver.name}`);
      console.log(`   - Email: ${sampleDriver.email}`);
      console.log(`   - Token: ${sampleDriver.notificationToken.substring(0, 30)}...`);
    }
  } catch (error) {
    console.log('❌ Error checking drivers:', error.message);
  }

  // 6. Summary
  console.log('\n📝 Summary:');
  console.log('   To test notifications:');
  console.log('   1. Log in to the app on a physical device');
  console.log('   2. Check console logs for "Expo push token:"');
  console.log('   3. Use test-notification.js with a real token');
  console.log('   4. Or test by creating a booking in the app');

  await mongoose.connection.close();
  console.log('\n✅ Verification complete!');
}

verifySetup().catch(console.error);

