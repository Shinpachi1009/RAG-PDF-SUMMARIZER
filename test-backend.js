// Simple test script to verify backend is working
// Run: node test-backend.js

const https = require('https');
const http = require('http');

// CONFIGURE THIS WITH YOUR NGROK URL
const NGROK_URL = 'https://overbumptiously-internecine-herbert.ngrok-free.dev'; // Update this!

console.log('========================================');
console.log('Testing Backend API');
console.log('========================================\n');

// Test 1: Local backend health check
console.log('Test 1: Testing local backend (http://localhost:3000/api/health)...');
testEndpoint('http://localhost:3000/api/health', false, (result) => {
  if (result.success) {
    console.log('✅ Local backend is running correctly\n');
    
    // Test 2: ngrok tunnel health check
    console.log('Test 2: Testing ngrok tunnel (' + NGROK_URL + '/api/health)...');
    testEndpoint(NGROK_URL + '/api/health', true, (result) => {
      if (result.success) {
        console.log('✅ ngrok tunnel is working correctly\n');
        console.log('========================================');
        console.log('All tests passed! ✅');
        console.log('Your backend is ready to use.');
        console.log('========================================\n');
        console.log('Next steps:');
        console.log('1. Update client/config.js with: ' + NGROK_URL);
        console.log('2. Deploy to Vercel');
        console.log('3. Test the frontend\n');
      } else {
        console.log('❌ ngrok tunnel test failed\n');
        console.log('Response:', result.data, '\n');
        console.log('Troubleshooting:');
        console.log('- Make sure ngrok is running: ngrok http 3000');
        console.log('- Update NGROK_URL in this test script');
        console.log('- Check if ngrok URL is correct (should start with https://)');
        console.log('- If you see HTML response, sign up for ngrok account to remove browser warning');
        console.log('- Run: ngrok config add-authtoken YOUR_TOKEN\n');
      }
    });
  } else {
    console.log('❌ Local backend test failed\n');
    console.log('Error:', result.error, '\n');
    console.log('Troubleshooting:');
    console.log('- Make sure backend is running: cd server && node index.js');
    console.log('- Check if port 3000 is available');
    console.log('- Check server logs for errors\n');
  }
});

function testEndpoint(url, skipNgrokWarning, callback) {
  const isHttps = url.startsWith('https');
  const client = isHttps ? https : http;
  
  const options = {
    method: 'GET',
    headers: {}
  };
  
  if (skipNgrokWarning) {
    options.headers['ngrok-skip-browser-warning'] = 'true';
  }
  
  const parsedUrl = new URL(url);
  options.hostname = parsedUrl.hostname;
  options.port = parsedUrl.port || (isHttps ? 443 : 80);
  options.path = parsedUrl.pathname;
  
  const req = client.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      const contentType = res.headers['content-type'] || '';
      
      if (contentType.includes('application/json')) {
        try {
          const parsed = JSON.parse(data);
          if (parsed.status === 'OK') {
            callback({ success: true, data: parsed });
          } else {
            callback({ success: false, data: parsed });
          }
        } catch (e) {
          callback({ success: false, error: 'Invalid JSON response', data });
        }
      } else {
        // Non-JSON response (probably ngrok browser warning)
        const preview = data.substring(0, 200);
        callback({ 
          success: false, 
          error: 'Non-JSON response received (ngrok browser warning?)',
          data: preview + '...'
        });
      }
    });
  });
  
  req.on('error', (error) => {
    callback({ success: false, error: error.message });
  });
  
  req.end();
}

// Instructions
if (NGROK_URL === 'https://overbumptiously-internecine-herbert.ngrok-free.dev') {
  console.log('\n⚠️  WARNING: Update NGROK_URL in this script first!\n');
  console.log('Edit test-backend.js and replace:');
  console.log('const NGROK_URL = \'https://overbumptiously-internecine-herbert.ngrok-free.dev\';');
  console.log('\nWith your actual ngrok URL from the terminal.\n');
}