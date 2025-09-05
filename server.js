const express = require('express');
const cors = require('cors');
const path = require('path');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Rota principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Rota para buscar anúncios REAIS
app.get('/api/ads/:advertiserId', async (req, res) => {
    let browser;
    try {
        const { advertiserId } = req.params;
        const { region = 'anywhere' } = req.query;
        
        console.log(`🎯 Tentando scraping REAL para: ${advertiserId}`);
        
        // Configuração otimizada para Render
        browser = await puppeteer.launch({
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--single-process',
                '--disable-gpu'
            ],
            headless: true,
            timeout: 30000
        });

        const page = await browser.newPage();
        
        // Configurar cabeçalhos para parecer humano
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        await page.setViewport({ width: 1280, height: 800 });
        
        // URL do Google Ads Transparency
        const url = `https://adstransparency.google.com/advertiser/${advertiserId}?region=${region}`;
        console.log(`🌐 Acessando: ${url}`);
        
        await page.goto(url, { 
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        // Aguardar e tentar encontrar anúncios
        await page.waitForTimeout(5000);
        
        // Extrair dados REAIS
        const realAds = await page.evaluate(() => {
            const ads = [];
            const adElements = document.querySelectorAll('[data-testid="ad-card"], .ad-card, .creative-container, [class*="ad"], [class*="creative"]');
            
            adElements.forEach((element, index) => {
                try {
                    // Extrair imagem
                    const imgElement = element.querySelector('img');
                    const imageUrl = imgElement ? imgElement.src : '';
                    
                    // Extrair texto
                    const textContent = element.textContent;
                    const hasEnglish = /[a-zA-Z]/.test(textContent) && textContent.length > 10;
                    
                    ads.push({
                        id: index + 1,
                        title: `Ad ${index + 1}`,
                        description: textContent.slice(0, 150) + '...',
                        imageUrl: imageUrl,
                        date: new Date().toLocaleDateString(),
                        regions: ['Global'],
                        format: "image",
                        hasEnglishText: hasEnglish,
                        englishConfidence: hasEnglish ? 85 : 15,
                        source: 'real'
                    });
                } catch (error) {
                    console.log('Erro ao extrair anúncio:', error);
                }
            });
            
            return ads;
        });

        await browser.close();
        
        if (realAds.length > 0) {
            console.log(`✅ Sucesso! Encontrados ${realAds.length} anúncios reais`);
            res.json({ 
                success: true,
                ads: realAds,
                total: realAds.length,
                source: 'real-scraping'
            });
        } else {
            console.log('⚠️  Nenhum anúncio real encontrado, usando dados simulados');
            res.json({ 
                success: true,
                ads: generateRealisticAds(advertiserId, region),
                total: 0,
                source: 'simulation-fallback'
            });
        }
        
    } catch (error) {
        console.error('❌ Erro no scraping:', error);
        if (browser) await browser.close();
        
        // Fallback para dados simulados
        res.json({ 
            success: false,
            ads: generateRealisticAds(req.params.advertiserId, req.query.region),
            error: error.message,
            source: 'error-fallback'
        });
    }
});

// Função de fallback
function generateRealisticAds(advertiserId, region) {
    // ... (manter a função anterior de dados simulados)
    return [{
        id: "fallback-1",
        title: "Exemplo (scraping falhou)",
        description: "O scraping real não funcionou. Estamos usando dados simulados.",
        imageUrl: "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=400&h=300&fit=crop",
        date: new Date().toLocaleDateString('pt-BR'),
        regions: [region || "Global"],
        format: "image",
        hasEnglishText: true,
        englishConfidence: 95,
        source: 'simulation'
    }];
}

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: '✅ ONLINE', 
        environment: process.env.NODE_ENV || 'development',
        puppeteer: 'enabled'
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor com Puppeteer rodando na porta ${PORT}`);
});
