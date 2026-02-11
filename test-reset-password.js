/**
 * Test reset password functionality
 * 
 * Usage: node test-reset-password.js <token> <new_password>
 */

const axios = require('axios');

const token = process.argv[2];
const newPassword = process.argv[3] || 'NewPassword123!';
const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

if (!token) {
  console.error('❌ Error: Token is required!');
  console.log('\nUsage: node test-reset-password.js <token> [new_password]');
  console.log('Example: node test-reset-password.js "eyJhbGci..." "NewPass123"');
  process.exit(1);
}

async function testResetPassword() {
  console.log('='.repeat(60));
  console.log('Testing Reset Password Feature');
  console.log('='.repeat(60));
  console.log('Token:', token.substring(0, 50) + '...');
  console.log('New Password:', '*'.repeat(newPassword.length));
  console.log('API URL:', `${baseUrl}/auth/reset-password`);
  console.log('-'.repeat(60));

  try {
    const response = await axios.post(`${baseUrl}/auth/reset-password`, {
      token: token,
      new_password: newPassword
    });

    console.log('\n✅ SUCCESS!');
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    console.log('\n🔐 Password has been reset successfully!');
    console.log('   You can now login with your new password');

  } catch (error) {
    console.log('\n❌ ERROR!');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Error:', JSON.stringify(error.response.data, null, 2));
      
      if (error.response.status === 400) {
        console.log('\n💡 Possible reasons:');
        console.log('   - Token has expired (valid for 1 hour only)');
        console.log('   - Token has already been used');
        console.log('   - Token is invalid or malformed');
      }
    } else {
      console.log('Error:', error.message);
    }
  }

  console.log('\n' + '='.repeat(60));
}

testResetPassword();
