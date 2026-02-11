/**
 * Test script for forgot password functionality
 * 
 * Usage: node test-forgot-password.js <email>
 * Example: node test-forgot-password.js togiap.dev@gmail.com
 */

const axios = require('axios');

const email = process.argv[2] || 'togiap.dev@gmail.com';
const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

async function testForgotPassword() {
  console.log('='.repeat(60));
  console.log('Testing Forgot Password Feature');
  console.log('='.repeat(60));
  console.log('Email:', email);
  console.log('API URL:', `${baseUrl}/auth/forgot-password`);
  console.log('-'.repeat(60));

  try {
    const response = await axios.post(`${baseUrl}/auth/forgot-password`, {
      email: email
    });

    console.log('\n✅ SUCCESS!');
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));

    if (response.data.resetToken) {
      console.log('\n🔑 Reset Token (Development Mode):');
      console.log(response.data.resetToken);
      console.log('\n📧 Check your email for the reset link!');
      console.log(`   Email should be sent to: ${email}`);
      console.log('\n🔗 Reset Password URL:');
      console.log(`   http://localhost:5173/reset-password?token=${response.data.resetToken}`);
    } else {
      console.log('\n📧 Production Mode - Check your email for reset link');
      console.log(`   Email should be sent to: ${email}`);
    }

  } catch (error) {
    console.log('\n❌ ERROR!');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Error:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('Error:', error.message);
    }
  }

  console.log('\n' + '='.repeat(60));
}

testForgotPassword();
