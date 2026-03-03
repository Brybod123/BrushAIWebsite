const fetch = require('node-fetch');

exports.handler = async (event, context) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { prompt, model } = JSON.parse(event.body);
        const API_KEY = process.env.POLLINATIONS_API_KEY;

        const response = await fetch('https://gen.pollinations.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(API_KEY && { 'Authorization': `Bearer ${API_KEY}` })
            },
            body: JSON.stringify({
                model: model || 'openai-fast',
                messages: [
                    { role: 'system', content: 'You are a professional creative assistant for BrushAI, a premium design platform.' },
                    { role: 'user', content: prompt }
                ],
                stream: false
            })
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error('Pollinations API error:', errorData);
            return {
                statusCode: response.status,
                body: JSON.stringify({ error: 'Failed to fetch from Pollinations' })
            };
        }

        const data = await response.json();
        return {
            statusCode: 200,
            body: JSON.stringify(data)
        };
    } catch (error) {
        console.error('Error in chat function:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal Server Error' })
        };
    }
};
