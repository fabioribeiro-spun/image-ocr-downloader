const express = require("express");
const axios = require("axios");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");
const archiver = require("archiver");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(morgan("tiny"));
app.use(express.json({ limit: "2mb" }));
app.use(express.static("public"));

// Proxy de imagem (CORS-free para o front usar no OCR)
app.get("/api/proxy-image", async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).send("url obrigatória");
  try {
    const up = await axios.get(url, { responseType: "stream", timeout: 20000, validateStatus: s => s >= 200 && s < 500 });
    const ct = up.headers["content-type"] || "application/octet-stream";
    res.setHeader("Content-Type", ct);
    up.data.pipe(res);
  } catch (e) {
    res.status(502).send("Falha ao buscar imagem.");
  }
});

// Recebe lista e devolve ZIP
app.post("/api/download-zip", async (req, res) => {
  const { urls } = req.body || {};
  if (!Array.isArray(urls) || urls.length === 0) {
    return res.status(400).json({ error: "Envie { urls: [...] }" });
  }

  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", 'attachment; filename="images.zip"');

  const zip = archiver("zip", { zlib: { level: 9 } });
  zip.on("error", err => { console.error(err); try { res.status(500).end(); } catch {} });
  zip.pipe(res);

  let i = 1;
  for (const u of urls) {
    try {
      const up = await axios.get(u, { responseType: "stream", timeout: 20000, validateStatus: s => s >= 200 && s < 500 });
      const ct = up.headers["content-type"] || "";
      let ext = ".jpg";
      if (ct.includes("png")) ext = ".png";
      else if (ct.includes("webp")) ext = ".webp";
      else if (ct.includes("gif")) ext = ".gif";
      else {
        const m = (new URL(u).pathname).match(/\.(jpg|jpeg|png|webp|gif|bmp)/i);
        if (m) ext = "." + m[1].toLowerCase();
      }
      zip.append(up.data, { name: `ad-${String(i).padStart(3,"0")}${ext}` });
      i++;
    } catch (e) {
      console.warn("Falha ao baixar:", u);
    }
  }

  zip.finalize();
});

app.listen(PORT, () => {
  console.log(`Servidor ON em http://localhost:${PORT}`);
});
