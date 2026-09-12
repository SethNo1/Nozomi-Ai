module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({
      error: "Method not allowed."
    });
  }

  const tokenHarbor = [
    {
      id: "deepseek-v4.1-flash:free",
      name: "DeepSeek V4.1 Flash",
      provider: "tokenharbor"
    },
    {
      id: "deepseek-v4-flash:free",
      name: "DeepSeek V4 Flash",
      provider: "tokenharbor"
    },
    {
      id: "mimo-v2.5:free",
      name: "MiMo V2.5",
      provider: "tokenharbor"
    }
  ];

  try {
    const apiKey = process.env.AICUTAD_API_KEY;

    if (!apiKey) {
      return res.status(200).json({
        models: tokenHarbor,
        warning: "AICUTAD_API_KEY belum tersedia."
      });
    }

    const upstream = await fetch(
      "https://ai.cutad.web.id/v1/models",
      {
        headers: {
          Authorization: `Bearer ${apiKey}`
        }
      }
    );

    const data = await upstream.json().catch(() => ({}));

    if (!upstream.ok) {
      return res.status(200).json({
        models: tokenHarbor,
        warning:
          (data.error && data.error.message) ||
          "Gagal mengambil daftar model CutadAI."
      });
    }

    const cutad = Array.isArray(data.data)
      ? data.data
          .filter(
            (model) =>
              model &&
              typeof model.id === "string"
          )
          .map((model) => ({
            id: model.id,
            name: model.id,
            provider: "aicutad"
          }))
      : [];

    return res.status(200).json({
      models: [
        ...tokenHarbor,
        ...cutad
      ]
    });

  } catch (err) {
    return res.status(200).json({
      models: tokenHarbor,
      warning:
        err?.message ||
        "Gagal memuat model."
    });
  }
};
