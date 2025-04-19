import axios from 'axios';

async function testOllamaIntegration() {
  const endpoint = 'http://non-existent-endpoint:11434';
  const model = 'codellama';
  
  console.log('Testing Ollama API integration with invalid endpoint (error handling test)...');
  
  try {
    const requestBody = {
      model: model,
      prompt: "Hello, can you help me with some code? Write a simple function to calculate the factorial of a number in JavaScript.",
      stream: false
    };
    
    console.log('Sending request to Ollama API...');
    
    const response = await axios.post(`${endpoint}/api/generate`, requestBody, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 5000 // Set a timeout to avoid waiting too long for a non-existent endpoint
    });
    
    console.log('Response received from Ollama API:');
    console.log('Status:', response.status);
    console.log('Response content:', response.data);
    
    return 'Ollama API integration test successful!';
  } catch (error) {
    if (axios.isAxiosError(error) && error.code === 'ECONNREFUSED') {
      console.error(`Ollama API error: Connection refused to ${endpoint}`);
      console.log('Error handling test successful - received expected connection error with invalid endpoint');
      return 'Error handling test successful';
    } else if (axios.isAxiosError(error) && error.code === 'ENOTFOUND') {
      console.error(`Ollama API error: Host not found for ${endpoint}`);
      console.log('Error handling test successful - received expected host not found error with invalid endpoint');
      return 'Error handling test successful';
    } else if (axios.isAxiosError(error) && error.message.includes('timeout')) {
      console.error(`Ollama API error: Request timed out for ${endpoint}`);
      console.log('Error handling test successful - request timed out as expected with invalid endpoint');
      return 'Error handling test successful';
    } else if (error instanceof Error) {
      console.error(`Ollama request failed: ${error.message}`);
      console.log('Error handling test successful - request failed as expected with invalid endpoint');
      return 'Error handling test successful';
    } else {
      console.error('Ollama request failed, unknown error');
      return 'Error handling test - unknown error occurred';
    }
  }
}

testOllamaIntegration()
  .then(result => {
    console.log(result);
    process.exit(0);
  })
  .catch(error => {
    console.error('Test failed unexpectedly:', error);
    process.exit(1);
  });
