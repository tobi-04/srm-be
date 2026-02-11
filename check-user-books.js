const jwt = require('jsonwebtoken');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2OTZkZThkMTQ2YjkxN2ViNjNkMTVlNzgiLCJlbWFpbCI6InRvZ2lhcC5pY2xvdW5kQGdtYWlsLmNvbSIsInJvbGUiOiJ1c2VyIiwibXVzdF9jaGFuZ2VfcGFzc3dvcmQiOmZhbHNlLCJpYXQiOjE3NzA3MjYzOTIsImV4cCI6MTc3MDcyNzI5Mn0.nbm_o3DjGeaxQLUOVm50fTmD2JA-U7T-o6rqVomIuyQ';

try {
  const decoded = jwt.decode(token);
  console.log('User ID:', decoded.sub);
  console.log('Email:', decoded.email);
} catch (e) {
  console.log('Error:', e.message);
}
