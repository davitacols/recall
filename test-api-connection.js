const axios = require('axios');

const API_URL = 'https://recall-backend-4hok.onrender.com/api';

async function testAPI() {
  console.log('Testing RECALL API connection...');
  console.log('API URL:', API_URL);
  
  try {
    // Test health endpoint
    console.log('\n1. Testing health endpoint...');
    const healthResponse = await axios.get(`${API_URL}/health/`);
    console.log('Health Status:', healthResponse.data);
    
    // Test auth endpoint with invalid credentials (should return error but not network error)
    console.log('\n2. Testing auth endpoint...');
    try {
      await axios.post(`${API_URL}/auth/login/`, {
        username: 'test@example.com',
        password: 'wrongpassword'
      });
    } catch (authError) {
      if (authError.response) {
        console.log('Auth endpoint working - got expected error:', authError.response.data);
      } else {
        console.log('Network error on auth endpoint:', authError.message);
      }
    }
    
    console.log('\n✅ API is accessible and working!');
    console.log('\nNext steps:');
    console.log('1. Make sure your mobile app is using the correct API URL');
    console.log('2. Restart your Expo development server');
    console.log('3. Clear your app cache if needed');
    
  } catch (error) {
    console.error('\n❌ API connection failed:', error.message);
    if (error.code === 'ENOTFOUND') {
      console.log('DNS resolution failed - check your internet connection');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('Connection refused - the server might be down');
    }
  }
}

testAPI();