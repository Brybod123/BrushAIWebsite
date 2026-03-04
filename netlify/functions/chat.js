const { stream } = require("@netlify/functions");

exports.handler = stream(async (event) => {
    try {
        const { messages, model, stream: shouldStream } = JSON.parse(event.body);
        const isOpenRouter = model && model.startsWith('google/');
        const API_KEY = process.env.POLLINATIONS_API_KEY;
        const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

        const endpoint = isOpenRouter
            ? 'https://openrouter.ai/api/v1/chat/completions'
            : 'https://gen.pollinations.ai/v1/chat/completions';

        const authHeader = isOpenRouter
            ? (OPENROUTER_API_KEY ? `Bearer ${OPENROUTER_API_KEY}` : undefined)
            : (API_KEY ? `Bearer ${API_KEY}` : undefined);

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(authHeader && { 'Authorization': authHeader }),
                ...(isOpenRouter && { 'HTTP-Referer': 'https://brushai.netlify.app' })
            },
            body: JSON.stringify({
                model: model || 'openai-fast',
                messages: messages,
                stream: !!shouldStream
            })
        });

        if (!response.ok) {
            const errorMsg = await response.text();
            console.error('Remote API Failure:', errorMsg);
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
