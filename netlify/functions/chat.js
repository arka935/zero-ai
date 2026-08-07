// Netlify Function: proxies chat requests to xAI so the API key never
// touches the browser / GitHub repo. Set XAI_API_KEY in Netlify's
// Site settings -> Environment variables (do NOT hardcode it here).

const MODEL = "grok-4.5"; // update this string when xAI ships a newer flagship

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "XAI_API_KEY belum diset di Environment variables Netlify." }),
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: "Body request tidak valid." }) };
  }

  const messages = payload.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return { statusCode: 400, body: JSON.stringify({ error: "Field 'messages' kosong." }) };
  }

  try {
    const upstream = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + apiKey,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: messages,
        temperature: 0.7,
      }),
    });

    const data = await upstream.json();

    if (!upstream.ok) {
      const msg = (data && data.error && data.error.message) || "xAI API mengembalikan error.";
      return { statusCode: upstream.status, body: JSON.stringify({ error: msg }) };
    }

    const reply = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || "";
    return { statusCode: 200, body: JSON.stringify({ reply: reply }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message || "Gagal menghubungi xAI." }) };
  }
};
