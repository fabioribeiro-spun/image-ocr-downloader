// server.js (com proxy robusto)
const express = require("express");
const cors = require("cors");
const path = require("path");
const { pipeline } = require("stream");
const { promisify } = require("util");
const fetch = (...args) => import("node-fetch").then(({default: f}) => f(...args));
const app = express();

const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json({ limit: "1mb" }));

// serve os arquivos do /public (index.html, ocr.html, etc.)
app.use(express.static(path.join(__dirname, "public"), {
  setHeaders(res) {
    // habilita uso em canvas
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  }
}));

/**
 * Proxy de imagem com cabeçalhos "amigáveis"
 * Ex.: GET /api/proxy-image?url=<URL-DA-IMAGEM>
 */
app.get("/api/proxy-image", async (req, res) => {
  try {
    const target = req.query.url;
    if (!target || !/^https?:\/\//i.test(target)) {
      return res.status(400).send("bad url");
    }

    // Alguns servidores do Google exigem UA e aceitam melhor com referer
    const r = await fetch(target, {
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
        "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        // referer ajuda em alguns hosts do Google
        "Referer": "https://adstransparency.google.com/",
      },
    });

    if (!r.ok) {
      return res.status(r.status).send("fetch error");
    }

    // repassa tipo e cache curto
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
 * Recebe { urls: [...] } e devolve um ZIP com as imagens aprovadas
 * (mantém sua implementação atual; abaixo um exemplo mínimo)
 */
const JSZip = require("jszip");
app.post("/api/download-zip", async (req, res) => {
  try {
    const urls = Array.isArray(req.body.urls) ? req.body.urls : [];
    if (!urls.length) return res.status(400).send("no urls");

    const zip = new JSZip();

    // baixa e coloca cada imagem no zip usando o mesmo proxy fetch
    for (let i = 0; i < urls.length; i++) {
      const u = urls[i];
      const r = await fetch(u, {
        redirect: "follow",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
            "(KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
          "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Referer": "https://adstransparency.google.com/",
        },
      });
      if (!r.ok) continue;
      const buf = await r.arrayBuffer();
      const ext = (r.headers.get("content-type") || "").split("/")[1] || "bin";
      zip.file(`img_${String(i+1).padStart(3,"0")}.${ext.split(";")[0]}`, Buffer.from(buf));
    }

    const blob = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", 'attachment; filename="ads-english.zip"');
    res.send(blob);
  } catch (e) {
    res.status(500).send("zip error");
  }
});

app.listen(PORT, () => {
  console.log(`Servidor ON em http://localhost:${PORT}`);
});
