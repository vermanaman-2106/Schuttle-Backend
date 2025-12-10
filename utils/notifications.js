/**
 * Push Notification Utility using Expo Push Notification Service
 * Documentation: https://docs.expo.dev/push-notifications/sending-notifications/
 */

/**
 * Send a push notification to a device using Expo Push Notification Service
 * @param {string} token - Expo push token
 * @param {string} title - Notification title
 * @param {string} body - Notification body/message
 * @param {object} data - Additional data to send with notification
 * @returns {Promise<object>} Response from Expo API
 */
const sendPushNotification = async (token, title, body, data = {}) => {
  if (!token || !token.trim()) {
    console.log('No notification token provided, skipping notification');
    return null;
  }

  try {
    const message = {
      to: token,
      sound: 'default',
      title: title,
      body: body,
      data: data,
      priority: 'high',
    };

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    
    if (result.data && result.data.status === 'ok') {
      console.log('Push notification sent successfully:', title);
      return result;
    } else {
      console.error('Failed to send push notification:', result);
      return null;
    }
  } catch (error) {
    console.error('Error sending push notification:', error);
    return null;
  }
};

module.exports = {
  sendPushNotification,
};

