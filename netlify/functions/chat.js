exports.handler = async (event) => {
  try {
    // Only allow POST
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: "Method Not Allowed" }),
      };
    }

    if (!event.body) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing request body" }),
      };
    }

    const { messages, model } = JSON.parse(event.body);

    const isOpenRouter = model && model.includes("/");
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

    // 🔒 Safe debug logs
    console.log("Is OpenRouter:", isOpenRouter);
    console.log("API Key Exists:", !!OPENROUTER_API_KEY);
    console.log(
      "API Key Length:",
      OPENROUTER_API_KEY ? OPENROUTER_API_KEY.length : 0
    );

    if (isOpenRouter && !OPENROUTER_API_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Missing OPENROUTER_API_KEY in environment variables",
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
      headers["X-Title"] = "Your App Name";
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: model || "gpt-4o-mini",
        messages,
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();

      console.error("Upstream Error:", errorText);

      return {
        statusCode: response.status,
        body: JSON.stringify({
          error: "Upstream API Error",
          status: response.status,
          details: errorText,
        }),
      };
    }

    const data = await response.json();

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    };

  } catch (error) {
    console.error("Function Crash:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Internal Server Error",
        message: error.message,
      }),
    };
  }
};