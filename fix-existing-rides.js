/**
 * Script to fix existing rides that don't have confirmed field
 * This will set confirmed: true and status: 'open' for existing rides
 * 
 * Usage: node fix-existing-rides.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Ride = require('./models/Ride');

async function fixRides() {
  try {
    // Connect to database
    if (!process.env.MONGO_URI) {
      console.log('❌ MONGO_URI not found in .env file');
      return;
    }
    
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to database\n');

    // Find all rides that are not confirmed or missing confirmed field
    const rides = await Ride.find({
      $or: [
        { confirmed: { $exists: false } },
        { confirmed: false }
      ]
    });

    console.log(`Found ${rides.length} ride(s) that need to be confirmed:\n`);

    if (rides.length === 0) {
      console.log('✅ All rides are already confirmed!');
      await mongoose.connection.close();
      return;
    }

    // Update all rides to be confirmed and open
    const result = await Ride.updateMany(
      {
        $or: [
          { confirmed: { $exists: false } },
          { confirmed: false }
        ]
      },
      {
        $set: {
          confirmed: true,
          status: 'open'
        }
      }
    );

    console.log(`✅ Updated ${result.modifiedCount} ride(s):`);
    console.log('   - Set confirmed: true');
    console.log('   - Set status: "open"\n');

    // Show updated rides
    const updatedRides = await Ride.find({ confirmed: true });
    console.log('Updated rides:');
    updatedRides.forEach((ride, index) => {
      console.log(`\n${index + 1}. ${ride.pickupLocation} → ${ride.dropLocation}`);
      console.log(`   Date: ${ride.date.toISOString().split('T')[0]}`);
      console.log(`   Time: ${ride.time}`);
      console.log(`   Seats: ${ride.availableSeats}/${ride.totalSeats}`);
      console.log(`   Status: ${ride.status}, Confirmed: ${ride.confirmed}`);
    });

    await mongoose.connection.close();
    console.log('\n✅ Done! Rides should now be visible to students.');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixRides();

