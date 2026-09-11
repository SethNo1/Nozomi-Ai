module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const message = String((req.body && req.body.message) || "").trim();

  if (!message) {
    return res.status(400).json({ error: "Pesan kosong." });
  }

  const apiKey = process.env.TOKENHARBOR_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "TOKENHARBOR_API_KEY belum dipasang di Environment Variables Vercel."
    });
  }

  try {
    const upstream = await fetch("https://tokenharbor.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "deepseek-v4.1-flash:free",
        messages: [
          {
            role: "system",
            content: "Kamu adalah Nozomi, asisten AI yang ramah, santai, membantu, dan menjawab dalam bahasa Indonesia kecuali pengguna meminta bahasa lain."
          },
          {
            role: "user",
            content: message
          }
        ]
      })
    });

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
      data.choices[0].message.content
        ? data.choices[0].message.content
        : "Nozomi tidak menerima jawaban dari model.";

    return res.status(200).json({ reply });
  } catch (error) {
    return res.status(500).json({ error: String(error) });
  }
};
