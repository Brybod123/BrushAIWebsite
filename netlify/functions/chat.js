const { stream } = require("@netlify/functions");

exports.handler = stream(async (event, context) => {
    console.log('Chat function invoked with streaming');
    console.log('Event:', JSON.stringify(event, null, 2));

    try {
        if (!event.body) {
            console.error('No request body provided');
            return { statusCode: 400, body: 'Missing request body' };
        }

        const { messages, model, stream: shouldStream } = JSON.parse(event.body);
        console.log('Parsed request:', { messages: messages?.length, model, shouldStream });

        // Route to OpenRouter if model contains a slash (e.g., 'anthropic/claude-3.5-haiku')
        const isOpenRouter = model && model.includes('/');
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

        let authHeader = undefined;
        if (isOpenRouter) {
            if (!OPENROUTER_API_KEY) {
                console.error('Missing OPENROUTER_API_KEY for OpenRouter endpoint');
                return {
                    statusCode: 500,
                    body: JSON.stringify({
                        error: 'Missing API key configuration',
                        details: 'The environment variable OPENROUTER_API_KEY is not set.'
                    })
                };
            }
            authHeader = `Bearer ${OPENROUTER_API_KEY}`;
        } else if (API_KEY) {
            authHeader = `Bearer ${API_KEY}`;
        }

        console.log('Making request to:', endpoint);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 55000);

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
            console.error(`Upstream error (${response.status}):`, errorMsg);
            return {
                statusCode: response.status,
                body: JSON.stringify({
                    error: 'Upstream Synthesis Error',
                    status: response.status,
                    details: errorMsg
                })
            };
        }

        // Manually handle SSE streaming to ensure proper format
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed) {
                    // Write each line to the Netlify stream
                    context.write(trimmed + '\n');
                }
            }
        }

        // Write any remaining buffer content
        if (buffer.trim()) {
            context.write(buffer);
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
