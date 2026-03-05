const { stream } = require("@netlify/functions");

exports.handler = stream(async (event, context) => {
    if (!event.body) {
        return { statusCode: 400, body: "Missing request body" };
    }

    const { messages, model, stream: shouldStream } = JSON.parse(event.body);
    const isOpenRouter = model && model.includes("/");
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

    if (isOpenRouter && !OPENROUTER_API_KEY) {
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: "Missing OPENROUTER_API_KEY",
                details: "The environment variable OPENROUTER_API_KEY is not set."
            })
        };
    }

    const endpoint = isOpenRouter
        ? "https://openrouter.ai/api/v1/chat/completions"
        : "https://gen.pollinations.ai/v1/chat/completions";

    const authHeader = isOpenRouter
        ? `Bearer ${OPENROUTER_API_KEY}`
        : process.env.POLLINATIONS_API_KEY
        ? `Bearer ${process.env.POLLINATIONS_API_KEY}`
        : undefined;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 55000);

    const upstreamResponse = await fetch(endpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(authHeader && { Authorization: authHeader }),
            ...(isOpenRouter && { "HTTP-Referer": "https://brushai.netlify.app" })
        },
        body: JSON.stringify({
            model: model || "openai-fast",
            messages: messages,
            stream: !!shouldStream,
            max_tokens: 4000,
            temperature: 0.7
        }),
        signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!upstreamResponse.ok) {
        const errorMsg = await upstreamResponse.text();
        return {
            statusCode: upstreamResponse.status,
            body: JSON.stringify({
                error: "Upstream Synthesis Error",
                status: upstreamResponse.status,
                details: errorMsg
            })
        };
    }

    // If streaming is requested, return the upstream response body directly
    if (shouldStream) {
        return new Response(upstreamResponse.body, {
            status: upstreamResponse.status,
            headers: upstreamResponse.headers
        });
    }

    // Non-streaming response
    const data = await upstreamResponse.json();
    return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    };
});
