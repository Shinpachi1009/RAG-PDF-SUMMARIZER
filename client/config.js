console.log('API Configuration loaded. Backend URL:', window.API_BASE_URL);

// API Configuration
// Replace 'your-ngrok-url' with your actual ngrok URL
// Example: 'https://1234-56-78-90-12.ngrok-free.app'

// IMPORTANT: No trailing slash!
window.API_BASE_URL = 'https://overbumptiously-internecine-herbert.ngrok-free.dev';

// You can also set this dynamically based on environment
// Uncomment the following if you want to detect environment automatically:
/*
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.API_BASE_URL = 'http://localhost:3000';
} else {
    window.API_BASE_URL = 'https://your-ngrok-url.ngrok-free.app';
}
*/

console.log('API Configuration loaded. Backend URL:', window.API_BASE_URL);

// Test connection on page load
(async function testConnection() {
    try {
        const response = await fetch(`${window.API_BASE_URL}/api/health`, {
            headers: {
                'ngrok-skip-browser-warning': 'true'
            }
        });
        
        const contentType = response.headers.get('content-type');
        
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            console.error('❌ Backend connection test failed: Received HTML instead of JSON');
            console.error('This usually means ngrok is showing its browser warning page.');
            console.error('Solution: Sign up at ngrok.com (free) and add your auth token:');
            console.error('  ngrok config add-authtoken YOUR_TOKEN');
            console.error('Response preview:', text.substring(0, 200));
            
            // Show user-friendly error
            setTimeout(() => {
                if (confirm('Backend connection issue detected!\n\nThe app cannot connect to your backend server.\n\nPossible issues:\n- ngrok is showing browser warning (sign up for free account)\n- ngrok is not running\n- Backend server is not running\n- Wrong ngrok URL in config.js\n\nClick OK to see setup instructions.')) {
                    window.open('https://github.com/your-repo/blob/main/NGROK_SETUP.md', '_blank');
                }
            }, 1000);
            return;
        }
        
        const data = await response.json();
        
        if (data.status === 'OK') {
            console.log('✅ Backend connection successful!');
            console.log('Service:', data.service);
            console.log('Timestamp:', data.timestamp);
        } else {
            console.warn('⚠️  Backend responded but status is not OK:', data);
        }
    } catch (error) {
        console.error('❌ Backend connection test failed:', error.message);
        console.error('Please check:');
        console.error('1. Backend server is running (node server/index.js)');
        console.error('2. ngrok is running (ngrok http 3000)');
        console.error('3. config.js has correct ngrok URL');
        console.error('4. ngrok URL starts with https:// not http://');
        
        // Show user-friendly error
        setTimeout(() => {
            const message = `Backend connection failed!\n\n${error.message}\n\nPlease check:\n1. Backend server is running\n2. ngrok is running\n3. config.js has correct URL\n\nCurrent URL: ${window.API_BASE_URL}`;
            alert(message);
        }, 1000);
    }
})();