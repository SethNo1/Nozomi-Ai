const TOKENHARBOR_MODELS = new Set([
  "deepseek-v4.1-flash:free",
  "deepseek-v4-flash:free",
  "mimo-v2.5:free"
]);

function extractReply(data) {
  return data?.choices?.[0]?.message?.content;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      error: "Method not allowed."
    });
  }

  try {
    const body = req.body || {};

    const message = String(body.message || "").trim();
    const provider = String(
      body.provider || "tokenharbor"
    ).trim();

    const model = String(body.model || "").trim();

    const attachments = Array.isArray(body.attachments)
      ? body.attachments
      : [];

    if (!message && attachments.length === 0) {
      return res.status(400).json({
        error: "Pesan kosong."
      });
    }

    let url;
    let apiKey;

    // =========================
    // PILIH PROVIDER
    // =========================

    if (provider === "aicutad") {
      url =
        "https://ai.cutad.web.id/v1/chat/completions";

      apiKey =
        process.env.AICUTAD_API_KEY;

      if (!apiKey) {
        return res.status(500).json({
          error:
            "AICUTAD_API_KEY belum tersedia di Vercel."
        });
      }

      if (!model) {
        return res.status(400).json({
          error:
            "Model CutadAI belum dipilih."
        });
      }

    } else {
      url =
        "https://tokenharbor.ai/v1/chat/completions";

      apiKey =
        process.env.TOKENHARBOR_API_KEY;

      if (!apiKey) {
        return res.status(500).json({
          error:
            "TOKENHARBOR_API_KEY belum tersedia di Vercel."
        });
      }

      if (!TOKENHARBOR_MODELS.has(model)) {
        return res.status(400).json({
          error:
            "Model TokenHarbor tidak valid."
        });
      }
    }

    // =========================
    // FILE TEKS / SOURCE CODE
    // =========================

    const textAttachments = attachments
      .filter(
        (file) =>
          file?.kind === "text" &&
          typeof file.content === "string"
      )
      .slice(0, 5)
      .map(
        (file) =>
          `\n\n[FILE: ${
            file.name || "attachment"
          }]\n${file.content}`
      )
      .join("");

    // =========================
    // GAMBAR
    // =========================

    const imageAttachments = attachments
      .filter(
        (file) =>
          file?.kind === "image" &&
          typeof file.dataUrl === "string"
      )
      .slice(0, 2);

    let userContent;

    // Format vision OpenAI-compatible.
    // Digunakan untuk model AICUTAD multimodal.
    if (
      provider === "aicutad" &&
      imageAttachments.length > 0
    ) {
      userContent = [
        {
          type: "text",
          text:
            (message ||
              "Analisis lampiran ini.") +
            textAttachments
        },

        ...imageAttachments.map((file) => ({
          type: "image_url",
          image_url: {
            url: file.dataUrl
          }
        }))
      ];

    } else {
      userContent =
        (message ||
          "Baca lampiran berikut.") +
        textAttachments;
    }

    // =========================
    // PERSONA NOZOMI
    // + PEMBUAT FILE
    // =========================

    const systemPrompt = [
      "Kamu adalah Nozomi, asisten AI yang ramah, santai, membantu, dan menjawab dalam bahasa pengguna.",

      "Jika pengguna meminta dibuatkan FILE yang dapat diunduh, keluarkan file menggunakan format tepat berikut:",

      "<<<FILE:nama_file.ext>>>",

      "isi file di sini",

      "<<<END_FILE>>>",

      "Boleh keluarkan beberapa blok FILE jika diperlukan.",

      "Jangan gunakan format FILE jika pengguna hanya meminta penjelasan biasa."
    ].join("\n");

    // =========================
    // TIMEOUT
    // =========================

    const controller =
      new AbortController();

    const timer = setTimeout(
      () => controller.abort(),
      55000
    );

    // =========================
    // REQUEST KE MODEL
    // =========================

    const upstream = await fetch(
      url,
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${apiKey}`,

          "Content-Type":
            "application/json"
        },

        signal: controller.signal,

        body: JSON.stringify({
          model: model,

          messages: [
            {
              role: "system",
              content: systemPrompt
            },

            {
              role: "user",
              content: userContent
            }
          ]
        })
      }
    ).finally(
      () => clearTimeout(timer)
    );

    const data =
      await upstream
        .json()
        .catch(() => ({}));

    // =========================
    // ERROR PROVIDER
    // =========================

    if (!upstream.ok) {
      return res
        .status(upstream.status)
        .json({
          error:
            data?.error?.message ||
            data?.message ||
            `Provider mengembalikan HTTP ${upstream.status}.`
        });
    }

    // =========================
    // AMBIL JAWABAN
    // =========================

    const reply =
      extractReply(data);

    if (!reply) {
      return res.status(502).json({
        error:
          "Model tidak mengembalikan jawaban."
      });
    }

    return res.status(200).json({
      reply: reply,
      model: model,
      provider: provider
    });

  } catch (err) {

    if (err?.name === "AbortError") {
      return res.status(504).json({
        error:
          "Model terlalu lama merespons. Coba lagi atau ganti model."
      });
    }

    console.error(
      "Nozomi API error:",
      err
    );

    return res.status(500).json({
      error:
        err?.message ||
        "Internal server error."
    });
  }
};
