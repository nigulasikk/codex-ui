import axios from 'axios';

async function testOpenRouterIntegration() {
  const apiKey = process.env.OPENROUTER_API_KEY || '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';
  
  console.log('Testing OpenRouter API integration...');
  
  try {
    const requestBody = {
      model: "anthropic/claude-3-opus:beta",
      messages: [
        {
          role: "user",
          content: "Hello, can you help me with some code? Write a simple function to calculate the factorial of a number in JavaScript."
        }
      ],
      max_tokens: 4000
    };
    
    console.log('Sending request to OpenRouter API...');
    
    const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', requestBody, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://github.com/nigulasikk/codex-ui',
        'X-Title': 'Codex UI'
      }
    });
    
    console.log('Response received from OpenRouter API:');
    console.log('Status:', response.status);
    console.log('Response content:', response.data.choices[0].message.content);
    
    return 'OpenRouter API integration test successful!';
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      console.error(`OpenRouter API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    } else if (error instanceof Error) {
      console.error(`OpenRouter request failed: ${error.message}`);
    } else {
      console.error('OpenRouter request failed, unknown error');
    }
    throw error;
  }
}

testOpenRouterIntegration()
  .then(result => {
    console.log(result);
    process.exit(0);
  })
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });
