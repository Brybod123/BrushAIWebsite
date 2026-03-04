const { stream } = require("@netlify/functions");

exports.handler = stream(async (event, { stream: netlifyStream }) => {
    console.log('Chat function invoked');
    console.log('Event:', JSON.stringify(event, null, 2));
    
    try {
        if (!event.body) {
            console.error('No request body provided');
            return { statusCode: 400, body: 'Missing request body' };
        }

        const { messages, model, stream: shouldStream } = JSON.parse(event.body);
        console.log('Parsed request:', { messages: messages?.length, model, shouldStream });
        
        const isOpenRouter = model && model.startsWith('google/');
        const API_KEY = process.env.POLLINATIONS_API_KEY;
        const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
        
        console.log('Environment variables check:', {
            hasPollinationsKey: !!API_KEY,
            hasOpenRouterKey: !!OPENROUTER_API_KEY,
            isOpenRouter
        });

        const endpoint = isOpenRouter
            ? 'https://openrouter.ai/api/v1/chat/completions'
            : 'https://gen.pollinations.ai/v1/chat/completions';

        const authHeader = isOpenRouter
            ? (OPENROUTER_API_KEY ? `Bearer ${OPENROUTER_API_KEY}` : undefined)
            : (API_KEY ? `Bearer ${API_KEY}` : undefined);

        if (!authHeader) {
            console.error('Missing API key for endpoint:', endpoint);
            return { statusCode: 500, body: 'Missing API key configuration' };
        }

        console.log('Making request to:', endpoint);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 55000); // 55 second timeout (Netlify max is 60s)

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
                stream: !!shouldStream,
                max_tokens: 4000,
                temperature: 0.7
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorMsg = await response.text();
            return { statusCode: response.status, body: errorMsg };
        }

        // Use the reader to pipe the response directly to Netlify's stream
        const reader = response.body.getReader();
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            // Write chunks to the Netlify stream immediately to prevent inactivity timeout
            netlifyStream.write(value);
        }

        return;
    } catch (error) {
        console.error('Synthesis Conduit Fault:', error);
        console.error('Error stack:', error.stack);
        return { 
            statusCode: 500, 
            body: JSON.stringify({ 
                error: 'Internal Synthesis Fault',
                message: error.message,
                stack: error.stack 
            })
        };
    }
});
