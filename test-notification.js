/**
 * Test script to send push notifications
 * 
 * Usage:
 * 1. Get a notification token from your database
 * 2. Replace TOKEN_HERE with the actual token
 * 3. Run: node test-notification.js
 */

const { sendPushNotification } = require('./utils/notifications');

// Replace with actual token from your database
// You can get it by querying: db.users.findOne({ email: "your-email@muj.manipal.edu" })
const TEST_TOKEN = 'ExponentPushToken[YOUR_TOKEN_HERE]';

async function testNotification() {
  console.log('Testing push notification...');
  console.log('Token:', TEST_TOKEN);
  
  if (TEST_TOKEN === 'ExponentPushToken[YOUR_TOKEN_HERE]') {
    console.error('❌ Please replace TOKEN_HERE with an actual notification token from your database!');
    console.log('\nTo get a token:');
    console.log('1. Log in to the app on a physical device');
    console.log('2. Check the console logs for "Expo push token:"');
    console.log('3. Or query MongoDB: db.users.findOne({ email: "your-email" }, { notificationToken: 1 })');
    return;
  }

  try {
    const result = await sendPushNotification(
      TEST_TOKEN,
      'Test Notification from Schuttle',
      'This is a test notification! If you receive this, notifications are working correctly. 🎉',
      {
        type: 'test',
        testId: '123',
        timestamp: new Date().toISOString(),
      }
    );

    if (result) {
      console.log('✅ Notification sent successfully!');
      console.log('Response:', JSON.stringify(result, null, 2));
      console.log('\nCheck your device - you should receive the notification!');
    } else {
      console.log('❌ Failed to send notification. Check the logs above for errors.');
    }
  } catch (error) {
    console.error('❌ Error sending notification:', error);
  }
}

// Run the test
testNotification();

