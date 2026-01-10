// API Configuration
// Replace 'your-ngrok-url' with your actual ngrok URL
// Example: 'https://1234-56-78-90-12.ngrok-free.app'

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