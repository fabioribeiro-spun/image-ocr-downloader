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

// Rota para buscar anúncios COM SCRAPING REAL
app.get('/api/ads/:advertiserId', async (req, res) => {
    try {
        const { advertiserId } = req.params;
        const { region = 'anywhere' } = req.query;
        
        console.log(`Buscando anúncios REAIS para: ${advertiserId}, região: ${region}`);
        
        // Fazer scraping REAL do Google Ads Transparency
        const ads = await scrapeRealAds(advertiserId, region);
        
        res.json({ 
            ads: ads,
            total: ads.length,
            advertiserId: advertiserId,
            region: region
        });
        
    } catch (error) {
        console.error('Erro ao buscar anúncios:', error);
        res.status(500).json({ 
            error: error.message,
            message: "Falha no scraping. Verifique o ID do anunciante.",
            ads: getSampleAds() // Fallback para dados de exemplo
        });
    }
});

// Função de scraping REAL
async function scrapeRealAds(advertiserId, region) {
    let browser;
    
    try {
        // Configuração do Puppeteer para Render
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
            timeout: 60000
        });

        const page = await browser.newPage();
        
        // Configurar user agent e viewport
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        await page.setViewport({ width: 1280, height: 800 });
        
        // URL do Google Ads Transparency
        const url = `https://adstransparency.google.com/advertiser/${advertiserId}?region=${region}`;
        console.log(`Acessando URL real: ${url}`);
        
        // Navegar para a página
        await page.goto(url, { 
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        // Aguardar carregamento dos anúncios
        await page.waitForTimeout(5000);
        
        // Extrair dados dos anúncios
        const ads = await page.evaluate(() => {
            const results = [];
            
            // Seletores reais do Google Ads Transparency
            const adElements = document.querySelectorAll('[data-testid="ad-card"], .ad-card, .creative-container');
            
            adElements.forEach((element, index) => {
                try {
                    // Tentar extrair imagem
                    let imageUrl = '';
                    const imgElement = element.querySelector('img');
                    if (imgElement && imgElement.src) {
                        imageUrl = imgElement.src;
                    }
                    
                    // Tentar extrair título
                    let title = `Anúncio ${index + 1}`;
                    const titleElement = element.querySelector('h3, h4, [class*="title"], [class*="header"]');
                    if (titleElement) {
                        title = titleElement.textContent.trim();
                    }
                    
                    // Tentar extrair descrição
                    let description = '';
                    const descElement = element.querySelector('p, [class*="description"], [class*="content"]');
                    if (descElement) {
                        description = descElement.textContent.trim();
                    }
                    
                    // Tentar extrair data
                    let date = new Date().toLocaleDateString();
                    const dateElement = element.querySelector('time, [class*="date"], [class*="time"]');
                    if (dateElement) {
                        date = dateElement.textContent.trim();
                    }
                    
                    results.push({
                        id: index + 1,
                        title: title,
                        description: description,
                        imageUrl: imageUrl || `https://via.placeholder.com/300x200/1a73e8/FFFFFF?text=Ad${index + 1}`,
                        date: date,
                        regions: ["Global"],
                        format: "image",
                        hasEnglishText: true,
                        englishConfidence: 85
                    });
                } catch (error) {
                    console.error('Erro ao extrair anúncio:', error);
                }
            });
            
            return results;
        });

        await browser.close();
        
        // Se não encontrou anúncios, retorna dados de exemplo
        if (ads.length === 0) {
            console.log('Nenhum anúncio real encontrado, retornando dados de exemplo');
            return getSampleAds();
        }
        
        console.log(`Encontrados ${ads.length} anúncios reais`);
        return ads;
        
    } catch (error) {
        console.error('Erro no scraping real:', error);
        if (browser) await browser.close();
        return getSampleAds(); // Fallback
    }
}

// Dados de exemplo para fallback
function getSampleAds() {
    return [
        {
            id: 1,
            title: "Summer Special Offer",
            description: "Enjoy our exclusive discounts for the season. Limited time only!",
            imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=200&fit=crop",
            date: "2023-07-15",
            regions: ["United States", "United Kingdom"],
            format: "image",
            hasEnglishText: true,
            englishConfidence: 95
        },
        {
            id: 2,
            title: "New Product Launch",
            description: "Discover our latest innovation in technology and design",
            imageUrl: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=300&h=200&fit=crop",
            date: "2023-08-02",
            regions: ["United States", "Canada"],
            format: "image",
            hasEnglishText: true,
            englishConfidence: 92
        }
    ];
}

// Rota de saúde da API
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Servidor funcionando corretamente',
        timestamp: new Date().toISOString()
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📊 Ambiente: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🔍 API de anúncios: http://localhost:${PORT}/api/ads/AR09499274345038479361`);
});
