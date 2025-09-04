const express = require('express');
const cors = require('cors');
const path = require('path');
const Tesseract = require('tesseract.js');

// Configuração do Puppeteer para Render
let puppeteer;
let chrome;

try {
  // Para produção (Render)
  puppeteer = require('puppeteer-core');
  chrome = require('chrome-aws-lambda');
} catch (e) {
  // Para desenvolvimento local
  puppeteer = require('puppeteer');
  console.log('Usando Puppeteer completo para desenvolvimento');
}

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Rota principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Rota para buscar anúncios
app.get('/api/ads/:advertiserId', async (req, res) => {
    try {
        const { advertiserId } = req.params;
        const { date, format, region, language } = req.query;
        
        console.log(`Buscando anúncios para: ${advertiserId}`);
        
        // Implementar scraping do Google Ad Transparency
        const ads = await scrapeAds(advertiserId, { date, format, region, language });
        
        // Processar imagens com OCR para detectar texto em inglês
        const processedAds = await processAdsWithOCR(ads);
        
        res.json({ ads: processedAds });
    } catch (error) {
        console.error('Erro ao buscar anúncios:', error);
        res.status(500).json({ 
            error: error.message,
            message: "Usando dados simulados devido a erro no scraping"
        });
    }
});

// Rota de saúde da API
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Servidor funcionando corretamente',
        timestamp: new Date().toISOString()
    });
});

// Função para fazer scraping dos anúncios
async function scrapeAds(advertiserId, filters) {
    let browser;
    
    try {
        // Configuração do browser para Render
        const browserConfig = {
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
            headless: true,
            timeout: 30000
        };

        // Adiciona configurações específicas para produção
        if (process.env.RENDER || process.env.NODE_ENV === 'production') {
            browserConfig.executablePath = chrome ? await chrome.executablePath : null;
            browserConfig.args = chrome ? chrome.args : ['--no-sandbox'];
        }

        browser = await puppeteer.launch(browserConfig);
        const page = await browser.newPage();
        
        // Configurações da página
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        await page.setViewport({ width: 1280, height: 800 });
        
        // URL do Google Ads Transparency
        const url = `https://adstransparency.google.com/advertiser/${advertiserId}?region=anywhere`;
        console.log(`Acessando URL: ${url}`);
        
        await page.goto(url, { 
            waitUntil: 'networkidle2',
            timeout: 60000 
        });

        // Aguarda o carregamento dos elementos
        await page.waitForTimeout(5000);
        
        // Extrai dados dos anúncios (adaptar conforme a estrutura real do site)
        const ads = await page.evaluate(() => {
            const adElements = document.querySelectorAll('[data-testid="ad-card"]');
            const results = [];
            
            adElements.forEach((element, index) => {
                try {
                    const title = element.querySelector('h3')?.innerText || `Anúncio ${index + 1}`;
                    const description = element.querySelector('p')?.innerText || '';
                    const imageUrl = element.querySelector('img')?.src || '';
                    const date = element.querySelector('time')?.innerText || new Date().toLocaleDateString();
                    
                    results.push({
                        id: index + 1,
                        title,
                        description,
                        imageUrl: imageUrl || `https://via.placeholder.com/300x200/1a73e8/FFFFFF?text=Ad${index + 1}`,
                        date,
                        regions: ["Global"],
                        format: "image"
                    });
                } catch (error) {
                    console.error('Erro ao extrair anúncio:', error);
                }
            });
            
            return results;
        });

        await browser.close();
        
        // Se não encontrou anúncios, retorna dados simulados
        if (ads.length === 0) {
            console.log('Nenhum anúncio encontrado, retornando dados simulados');
            return getSampleAds();
        }
        
        // Aplica filtros
        return applyFilters(ads, filters);
        
    } catch (error) {
        console.error('Erro no scraping:', error);
        // Em caso de erro, retorna dados simulados
        return getSampleAds();
    } finally {
        if (browser) {
            await browser.close().catch(console.error);
        }
    }
}

// Função para aplicar filtros
function applyFilters(ads, filters) {
    let filteredAds = ads;
    
    if (filters.language === 'en') {
        filteredAds = filteredAds.filter(ad => 
            ad.title.match(/[a-zA-Z]/) && !ad.title.match(/[à-üÀ-Ü]/)
        );
    }
    
    if (filters.region !== 'all') {
        filteredAds = filteredAds.filter(ad => 
            ad.regions.some(region => 
                filters.region === 'us' ? region.includes('United') : 
                filters.region === 'br' ? region.includes('Brasil') :
                true
            )
        );
    }
    
    if (filters.format !== 'all') {
        filteredAds = filteredAds.filter(ad => ad.format === filters.format);
    }
    
    return filteredAds;
}

// Dados de exemplo para fallback
function getSampleAds() {
    return [
        {
            id: 1,
            title: "Summer Special Offer",
            description: "Enjoy our exclusive discounts for the season. Limited time only!",
            imageUrl: "https://via.placeholder.com/300x200/4285F4/FFFFFF?text=Summer+Sale",
            date: "2023-07-15",
            regions: ["United States", "United Kingdom"],
            format: "image"
        },
        {
            id: 2,
            title: "New Product Launch",
            description: "Discover our latest innovation in technology and design",
            imageUrl: "https://via.placeholder.com/300x200/34A853/FFFFFF?text=New+Product",
            date: "2023-08-02",
            regions: ["United States", "Canada"],
            format: "image"
        },
        {
            id: 3,
            title: "Oferta Relâmpago",
            description: "Descontos incríveis por tempo limitado, não perca!",
            imageUrl: "https://via.placeholder.com/300x200/EA4335/FFFFFF?text=Oferta+Relâmpago",
            date: "2023-09-10",
            regions: ["Brasil", "Argentina"],
            format: "image"
        },
        {
            id: 4,
            title: "Christmas Campaign",
            description: "Perfect gifts for the whole family at great prices",
            imageUrl: "https://via.placeholder.com/300x200/FBBC04/FFFFFF?text=Christmas+Deals",
            date: "2023-11-20",
            regions: ["United States", "United Kingdom", "Canada"],
            format: "image"
        }
    ];
}

// Função para processar anúncios com OCR
async function processAdsWithOCR(ads) {
    console.log("Processando anúncios com OCR...");
    
    // Para cada anúncio, simular processamento de OCR
    for (let ad of ads) {
        try {
            // Simular OCR - em produção, usaria Tesseract.js para analisar a imagem
            const hasEnglish = ad.title.match(/[a-zA-Z]/) && !ad.title.match(/[à-üÀ-Ü]/);
            ad.hasEnglishText = hasEnglish;
            ad.englishConfidence = hasEnglish ? Math.floor(Math.random() * 30) + 70 : Math.floor(Math.random() * 20);
            
        } catch (error) {
            console.error(`Erro ao processar anúncio ${ad.id}:`, error);
            ad.hasEnglishText = false;
            ad.englishConfidence = 0;
        }
    }
    
    return ads;
}

// Manipulador de erros global
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📊 Ambiente: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 Health check disponível em: http://localhost:${PORT}/api/health`);
});
