exports.handler = async (event) => {
  try {
    if (!event.body) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing request body" }),
      };
    }

    const { messages, model, stream: shouldStream } = JSON.parse(event.body);

    const isOpenRouter = model && model.includes("/");
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

    if (isOpenRouter && !OPENROUTER_API_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Missing OPENROUTER_API_KEY",
        }),
      };
    }

    const endpoint = isOpenRouter
      ? "https://openrouter.ai/api/v1/chat/completions"
      : "https://gen.pollinations.ai/v1/chat/completions";

    const headers = {
      "Content-Type": "application/json",
    };

    if (isOpenRouter) {
      headers["Authorization"] = `Bearer ${OPENROUTER_API_KEY}`;
      headers["HTTP-Referer"] = "https://your-site.netlify.app";
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 55000);

    const upstreamResponse = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: model || "gpt-4o-mini",
        messages,
        stream: !!shouldStream,
        max_tokens: 1000,
        temperature: 0.7,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!upstreamResponse.ok) {
      const errorText = await upstreamResponse.text();

      return {
        statusCode: upstreamResponse.status,
        body: JSON.stringify({
          error: "Upstream Error",
          details: errorText,
        }),
      };
    }

    // STREAMING RESPONSE
    if (shouldStream) {
      return new Response(upstreamResponse.body, {
        status: 200,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // NORMAL RESPONSE
    const data = await upstreamResponse.json();

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error("Function Error:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Internal Server Error",
        message: error.message,
      }),
    };
  }
};