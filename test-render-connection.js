/**
 * Test script to verify Render backend connection
 * Run: node test-render-connection.js
 */

const axios = require('axios');

const RENDER_URL = 'https://schuttle-backend.onrender.com';

async function testConnection() {
  console.log('🔍 Testing Render Backend Connection...\n');

  try {
    // Test 1: Root endpoint
    console.log('1. Testing root endpoint (/)...');
    const rootResponse = await axios.get(`${RENDER_URL}/`);
    console.log('   ✅ Root endpoint works');
    console.log('   Response:', rootResponse.data);
    console.log('');

    // Test 2: Health check
    console.log('2. Testing health endpoint (/api/health)...');
    const healthResponse = await axios.get(`${RENDER_URL}/api/health`);
    console.log('   ✅ Health endpoint works');
    console.log('   Response:', healthResponse.data);
    console.log('');

    // Test 3: Rides endpoint (public)
    console.log('3. Testing rides endpoint (/api/rides)...');
    const ridesResponse = await axios.get(`${RENDER_URL}/api/rides`);
    console.log('   ✅ Rides endpoint works');
    console.log(`   Found ${ridesResponse.data.count} ride(s)`);
    console.log('');

    console.log('✅ All endpoints are working!');
    console.log('\n📱 Your app should connect to:', `${RENDER_URL}/api`);
    console.log('\n⚠️  Note: Make sure your app is not in __DEV__ mode to use Render URL');
    console.log('   Or temporarily change axios.js to force production URL');

  } catch (error) {
    console.error('❌ Error testing connection:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    } else if (error.request) {
      console.error('   No response received. Check if backend is deployed and running.');
    }
  }
}

testConnection();

