import express from "express";
import axios from "axios";
import cors from "cors";
import morgan from "morgan";
import cheerio from "cheerio";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(morgan("tiny"));
app.use(express.static("public"));

const resolveUrl = (src, base) => {
  try { return new URL(src, base).href; } catch { return null; }
};

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

    const base = new URL(url).origin;
    const $ = cheerio.load(htmlResp.data);
    const urls = new Set();

    $("img").each((_, el) => {
      const src = $(el).attr("src") || $(el).attr("data-src") || "";
      const out = resolveUrl(src, base);
      if (!out) return;
      const bad = out.startsWith("data:") || out.endsWith(".svg") || out.includes("sprite") || out.includes("icon") || out.includes("logo");
      if (!bad) urls.add(out);
    });

    $("source").each((_, el) => {
      const srcset = $(el).attr("srcset");
      if (srcset) {
        const first = srcset.split(",")[0].trim().split(" ")[0];
        const out = resolveUrl(first, base);
        if (out) urls.add(out);
      }
    });

    const list = Array.from(urls).slice(0, Number(limit));
    res.json({ ok: true, count: list.length, images: list });
  } catch (err) {
    res.status(500).json({ error: "Falha ao carregar página alvo.", detail: String(err.message || err) });
  }
});

app.get("/api/proxy-image", async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).send("url obrigatória");
  try {
    const upstream = await axios.get(url, { responseType: "stream", timeout: 15000 });
    const ct = upstream.headers["content-type"] || "application/octet-stream";
    res.setHeader("Content-Type", ct);
    upstream.data.pipe(res);
  } catch (err) {
    res.status(502).send("Falha ao buscar imagem.");
  }
});

app.listen(PORT, () => console.log(`Servidor ON em http://localhost:${PORT}`));