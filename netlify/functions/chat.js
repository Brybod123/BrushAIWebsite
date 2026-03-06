exports.handler = async (event, context) => {
  try {
    const { messages, model } = JSON.parse(event.body);
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'BrushAI',
        'X-Title': 'BrushAI'
      },
      body: JSON.stringify({
        model: model || 'openrouter/gpt-4o-mini',
        messages,
        max_tokens: 1000,
        temperature: 0.7
      })
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