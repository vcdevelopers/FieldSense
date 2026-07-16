const http = require('http');

const options = {
  hostname: '127.0.0.1',
  port: 8000,
  path: '/api/field-tracking/mom-form-template/',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'X-User-Role': 'ADMIN'
  }
};

const req = http.request(options, res => {
  console.log(`statusCode: ${res.statusCode}`);
  res.on('data', d => {
    process.stdout.write(d);
  });
});

req.on('error', error => {
  console.error(error);
});

req.end();
