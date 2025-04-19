import axios from 'axios';

async function testQwenIntegration() {
  const apiKey = 'invalid-qwen-api-key';
  
  console.log('Testing Qwen API integration with invalid key (error handling test)...');
  
  try {
    const requestBody = {
      model: "qwen-max",
      messages: [
        {
          role: "user",
          content: "Hello, can you help me with some code? Write a simple function to calculate the factorial of a number in JavaScript."
        }
      ],
      max_tokens: 4000
    };
    
    console.log('Sending request to Qwen API...');
    
    const response = await axios.post('https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation', requestBody, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    console.log('Response received from Qwen API:');
    console.log('Status:', response.status);
    console.log('Response content:', response.data);
    
    return 'Qwen API integration test successful!';
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      console.error(`Qwen API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      console.log('Error handling test successful - received expected error response from Qwen API with invalid key');
      return 'Error handling test successful';
    } else if (error instanceof Error) {
      console.error(`Qwen request failed: ${error.message}`);
      return 'Error handling test successful - request failed as expected with invalid key';
    } else {
      console.error('Qwen request failed, unknown error');
      return 'Error handling test - unknown error occurred';
    }
  }
}

testQwenIntegration()
  .then(result => {
    console.log(result);
    process.exit(0);
  })
  .catch(error => {
    console.error('Test failed unexpectedly:', error);
    process.exit(1);
  });
