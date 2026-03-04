const { stream } = require("@netlify/functions");

exports.handler = stream(async (event) => {
    try {
        const { messages, model, stream: shouldStream } = JSON.parse(event.body);
        const API_KEY = process.env.POLLINATIONS_API_KEY;

        const response = await fetch('https://gen.pollinations.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(API_KEY && { 'Authorization': `Bearer ${API_KEY}` })
            },
            body: JSON.stringify({
                model: model || 'openai-fast',
                messages: messages,
                stream: !!shouldStream
            })
        });

        if (!response.ok) {
            const errorMsg = await response.text();
            console.error('Core Sync Failure:', errorMsg);
            return { statusCode: response.status, body: errorMsg };
        }

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive"
            },
            body: response.body
        };
    } catch (error) {
        console.error('Synthesis Conduit Fault:', error);
        return { statusCode: 500, body: 'Internal Synthesis Fault' };
    }
});
