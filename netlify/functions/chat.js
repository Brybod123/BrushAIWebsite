exports.handler = async (event, context) => {
  try {
    const { messages, model, provider, search, replace } = JSON.parse(event.body);
    
    // Handle search and replace for instant updates
    if (search && replace) {
      // Add a system message for AI to do search and replace
      const updatedMessages = [
        ...messages,
        {
          role: 'system',
          content: `Please search for "${search}" and replace it with "${replace}" in the previous response. Return only the updated content.`
        }
      ];
      
      // Continue with normal AI processing but with updated messages
      messages = updatedMessages;
    }
    
    let endpoint, headers, requestBody;

    if (provider === 'pln' || (!provider && model === 'gemini-fast')) {
      // Pollinations
      const POLLINATIONS_API_KEY = process.env.POLLINATIONS_API_KEY;
      endpoint = 'https://gen.pollinations.ai/v1/chat/completions';
      headers = { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${POLLINATIONS_API_KEY}`
      };
      requestBody = {
        model: model || 'gemini-fast',
        messages: messages,
        max_tokens: 8000,
        temperature: 0.7
      };
    } else {
      // OpenRouter (default)
      const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
      endpoint = 'https://openrouter.ai/api/v1/chat/completions';
      headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'BrushAI',
        'X-Title': 'BrushAI'
      };
      requestBody = {
        model: model || 'openai/gpt-4o-mini',
        messages: messages,
        max_tokens: 8000,
        temperature: 0.7
      };
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();
    return {
      statusCode: 200,
      body: JSON.stringify(data)
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};