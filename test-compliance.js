import axios from 'axios';
import "dotenv/config";
import { randomUUID } from 'crypto';

// Test the compliance screening API
const testComplianceScreening = async () => {
  const API_KEY = process.env.CIRCLE_API_KEY || 'YOUR_API_KEY_HERE';
  
  // Test addresses (you can replace with actual addresses)
  const testAddresses = [
    '0x7306aC7A32eb690232De81a9FFB44Bb346026faB', // Normal address
    // '0x7fb49965753A9eC3646fd5d004ee5AeD6Cc89999', // Potentially flagged address
  ];

  console.log('🔍 Testing Circle Compliance Screening API...\n');
  console.log('API Key:', API_KEY ? 'Set' : 'Not set');
  console.log('---\n');

  for (const address of testAddresses) {
    console.log(`Testing address: ${address}`);
    
    try {
      // Use a valid UUID v4 for idempotencyKey
      const idempotencyKey = randomUUID();
      
      const options = {
        method: 'POST',
        url: 'https://api.circle.com/v1/w3s/compliance/screening/addresses',
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
        data: {
          idempotencyKey: idempotencyKey,
          address: address,
          chain: 'BASE-SEPOLIA',
        },
      };

      console.log('Idempotency Key:', idempotencyKey);
      console.log('Chain:', options.data.chain);

      const response = await axios.request(options);
      const data = response.data;
      console.log("data", data);

      console.log(`📋 Result: ${data.result}`);
      
      if (data.result === 'DENIED') {
        console.log('❌ DENIED - Transaction would be blocked');
        console.log(`Rule: ${data.decision?.ruleName || 'Unknown'}`);
        console.log(`Actions: ${data.decision?.actions?.join(', ') || 'None'}`);
        console.log(`Risk Categories: ${data.decision?.reasons?.[0]?.riskCategories?.join(', ') || 'None'}`);
      } else if (data.result === 'REVIEW') {
        console.log('⚠️ REVIEW - Manual review recommended');
      } else {
        console.log('✅ APPROVED - Transaction would be allowed');
      }
      
    } catch (error) {
      console.log('❌ Error!');
      if (error.response) {
        console.log('Status:', error.response.status);
        console.log('Error data:', JSON.stringify(error.response.data, null, 2));
      } else {
        console.log('Error message:', error.message);
      }
    }
    
    console.log('---\n');
  }
};

// Run the test
testComplianceScreening().catch(console.error); 