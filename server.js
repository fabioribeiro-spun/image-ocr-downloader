// server.js — backend do OCR (Express + proxy + ZIP)
const express = require("express");
const cors = require("cors");
const path = require("path");
const { pipeline } = require("stream");
const { promisify } = require("util");
const fetch = require("node-fetch");            // v2 (CommonJS)
const JSZip = require("jszip");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json({ limit: "1mb" }));

// Servir os arquivos da pasta /public (index.html, ocr.html, etc.)
app.use(
  express.static(path.join(__dirname, "public"), {
    setHeaders(res) {
      // libera uso em canvas
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    },
  })
);

/**
 * GET /api/proxy-image?url=<URL>
 * Proxy de imagem com cabeçalhos amigáveis (aceita redirects)
 */
app.get("/api/proxy-image", async (req, res) => {
  try {
    const target = req.query.url;
    if (!target || !/^https?:\/\//i.test(target)) {
      return res.status(400).send("bad url");
    }

    const r = await fetch(target, {
      redirect: "follow",
      headers: {
        // alguns hosts do Google ficam mais permissivos com esses headers
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        Referer: "https://adstransparency.google.com/",
      },
    });

    if (!r.ok) return res.status(r.status).send("fetch error");

    const ctype = r.headers.get("content-type") || "application/octet-stream";
    res.setHeader("Content-Type", ctype);
    res.setHeader("Cache-Control", "public, max-age=300");

    const streamPipeline = promisify(pipeline);
    await streamPipeline(r.body, res);
  } catch (e) {
    res.status(502).send("proxy fail");
  }
});

/**
 * POST /api/download-zip
 * Body: { urls: string[] }
 * Baixa as imagens e devolve um ZIP.
 */
app.post("/api/download-zip", async (req, res) => {
  try {
    const urls = Array.isArray(req.body.urls) ? req.body.urls : [];
    if (!urls.length) return res.status(400).send("no urls");

    const zip = new JSZip();
    let idx = 0;

    // Baixa cada imagem
    for (const u of urls) {
      try {
        const r = await fetch(u, {
          redirect: "follow",
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
            Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            Referer: "https://adstransparency.google.com/",
          },
        });
        if (!r.ok) continue;

        const buf = await r.arrayBuffer();
        const ct = (r.headers.get("content-type") || "").toLowerCase();
        let ext = "bin";
        if (ct.includes("jpeg")) ext = "jpg";
        else if (ct.includes("png")) ext = "png";
        else if (ct.includes("webp")) ext = "webp";
        else if (ct.includes("gif")) ext = "gif";
        else if (ct.includes("bmp")) ext = "bmp";
        else if (ct.includes("svg")) ext = "svg";

        idx += 1;
        zip.file(`img_${String(idx).padStart(3, "0")}.${ext}`, Buffer.from(buf));
      } catch (_) {
        // ignora falha individual
      }
    }

    const blob = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
    });

    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="ads-english.zip"'
    );
    res.send(blob);
  } catch (e) {
    res.status(500).send("zip error");
  }
});

app.listen(PORT, () => {
  console.log(`Servidor ON em http://localhost:${PORT}`);
});
