// ===== Imports =====
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");
const archiver = require("archiver");

// ===== App =====
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(morgan("tiny"));
app.use(express.json({ limit: "2mb" }));
app.use(express.static("public"));

// ===== Helpers =====
const resolveUrl = (src, base) => {
  try { return new URL(src, base).href; } catch { return null; }
};

// ===== Rota: buscar imagens genéricas (HTML estático) =====
// (útil para sites que não são SPA)
app.get("/api/fetch-images", async (req, res) => {
  const { url, limit = 60 } = req.query;
  if (!url) return res.status(400).json({ error: "Parâmetro 'url' é obrigatório." });

  try {
    const htmlResp = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9,pt-BR;q=0.8"
      },
      timeout: 15000,
      maxRedirects: 5,
      validateStatus: s => s >= 200 && s < 400
    });

    // parse simples via regex (evitamos cheerio pra manter leve)
    const base = new URL(url).origin;
    const html = String(htmlResp.data || "");
    const urls = new Set();

    // <img src|data-src>
    const imgRe = /<img\b[^>]+?(?:src|data-src)\s*=\s*["']([^"']+)["']/gi;
    let m;
    while ((m = imgRe.exec(html))) {
      const out = resolveUrl(m[1], base);
      if (!out) continue;
      const bad = out.startsWith("data:") || /\.svg($|\?)/i.test(out) || /sprite|icon|logo/i.test(out);
      if (!bad) urls.add(out);
    }

    // <source srcset>
    const srcsetRe = /<source\b[^>]+?srcset\s*=\s*["']([^"']+)["']/gi;
    while ((m = srcsetRe.exec(html))) {
      const first = m[1].split(",")[0].trim().split(" ")[0];
      const out = resolveUrl(first, base);
      if (out) urls.add(out);
    }

    const list = Array.from(urls).slice(0, Number(limit));
    res.json({ ok: true, count: list.length, images: list });
  } catch (err) {
    res.status(500).json({ error: "Falha ao carregar página alvo.", detail: String(err.message || err) });
  }
});

// ===== Rota: proxy CORS de imagem =====
app.get("/api/proxy-image", async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).send("url obrigatória");
  try {
    const upstream = await axios.get(url, { responseType: "stream", timeout: 20000, validateStatus: s => s >= 200 && s < 500 });
    const ct = upstream.headers["content-type"] || "application/octet-stream";
    res.setHeader("Content-Type", ct);
    upstream.data.pipe(res);
  } catch (err) {
    res.status(502).send("Falha ao buscar imagem.");
  }
});

// ===== Rota: zipar uma lista de URLs =====
// Body: { "urls": ["https://...","https://..."] }
app.post("/api/download-zip", async (req, res) => {
  const { urls } = req.body || {};
  if (!Array.isArray(urls) || urls.length === 0) {
    return res.status(400).json({ error: "Envie { urls: [ ... ] } com pelo menos 1 URL." });
  }

  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", 'attachment; filename="images.zip"');

  const zip = archiver("zip", { zlib: { level: 9 } });
  zip.on("error", err => { console.error(err); try { res.status(500).end(); } catch {} });
  zip.pipe(res);

  let idx = 1;
  for (const u of urls) {
    try {
      const upstream = await axios.get(u, { responseType: "stream", timeout: 20000, validateStatus: s => s >= 200 && s < 500 });
      const ct = upstream.headers["content-type"] || "";
      let ext = ".jpg";
      if (ct.includes("png")) ext = ".png";
      else if (ct.includes("webp")) ext = ".webp";
      else if (ct.includes("gif")) ext = ".gif";
      else {
        const m = (new URL(u).pathname).match(/\.(jpg|jpeg|png|webp|gif|bmp)/i);
        if (m) ext = "." + m[1].toLowerCase();
      }
      zip.append(upstream.data, { name: `ad-${String(idx).padStart(3, "0")}${ext}` });
      idx++;
    } catch (e) {
      console.warn("Falha ao baixar:", u);
    }
  }

  zip.finalize();
});

// ===== Start =====
app.listen(PORT, () => {
  console.log(`Servidor ON em http://localhost:${PORT}`);
});
