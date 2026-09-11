const ALLOWED_MODELS = new Set([
  "deepseek-v4.1-flash:free",
  "deepseek-v4-flash:free",
  "mimo-v2.5:free"
]);

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      error: "Method not allowed."
    });
  }

  try {
    const message = String(
      (req.body && req.body.message) || ""
    ).trim();

    const requestedModel = String(
      (req.body && req.body.model) || ""
    ).trim();

    const model = ALLOWED_MODELS.has(requestedModel)
      ? requestedModel
      : "deepseek-v4.1-flash:free";

    if (!message) {
      return res.status(400).json({
        error: "Pesan kosong."
      });
    }

    const apiKey = process.env.TOKENHARBOR_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error:
          "TOKENHARBOR_API_KEY belum dipasang di Environment Variables Vercel."
      });
    }

    const upstream = await fetch(
      "https://tokenharbor.ai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + apiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content:
                "Kamu adalah Nozomi, asisten AI yang ramah, santai, membantu, dan menjawab dalam bahasa pengguna."
            },
            {
              role: "user",
              content: message
            }
          ]
        })
      }
    );

    const data = await upstream.json().catch(() => ({}));

    if (!upstream.ok) {
      return res.status(upstream.status).json({
        error:
          (data.error && data.error.message) ||
          data.message ||
          "TokenHarbor mengembalikan error."
      });
    }

    const reply =
      data &&
      data.choices &&
      data.choices[0] &&
      data.choices[0].message &&
      data.choices[0].message.content;

    if (!reply) {
      return res.status(502).json({
        error: "Model tidak mengembalikan jawaban."
      });
    }

    return res.status(200).json({
      reply,
      model
    });
  } catch (err) {
    console.error("Nozomi API error:", err);

    return res.status(500).json({
      error: (err && err.message) || "Internal server error."
    });
  }
};
