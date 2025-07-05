import axios from 'axios';
import "dotenv/config";


// Replace with your actual Circle API key
const API_KEY = process.env.CIRCLE_API_KEY || 'YOUR_API_KEY_HERE';

const options = {
  method: 'POST',
  url: 'https://api.circle.com/v1/w3s/compliance/screening/addresses',
  headers: {
    Authorization: `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
  },
  data: {
    idempotencyKey: '44bd2d89-9461-4502-84ba-550c9e278db7', // unique-idempotency-key
    address: '0x7306aC7A32eb690232De81a9FFB44Bb346026faB',
    chain: 'ETH-SEPOLIA',
  },
};

console.log('Testing Circle API compliance screening...');
console.log('API Key:', API_KEY ? 'Set' : 'Not set');
console.log('Address:', options.data.address);
console.log('Chain:', options.data.chain);
console.log('---');

axios
  .request(options)
  .then(function (response) {
    console.log('✅ Success!');
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
  })
  .catch(function (error) {
    console.log('❌ Error!');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Error data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('Error message:', error.message);
    }
  }); 