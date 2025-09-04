const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');
const Tesseract = require('tesseract.js');
const path = require('path');

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
        res.status(500).json({ error: error.message });
    }
});

// Função para fazer scraping dos anúncios
async function scrapeAds(advertiserId, filters) {
    // Esta é uma função simulada - em produção, implementaria o scraping real
    console.log(`Simulando scraping para: ${advertiserId}`);
    
    // Dados de exemplo
    const sampleAds = [
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
    
    // Aplicar filtros
    let filteredAds = sampleAds;
    
    if (filters.language === 'en') {
        // Filtrar apenas anúncios em inglês
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
            
            // Em produção real, faríamos:
            // const result = await Tesseract.recognize(ad.imageUrl, 'eng');
            // ad.hasEnglishText = result.data.text.length > 10;
            // ad.englishConfidence = result.data.confidence;
            
        } catch (error) {
            console.error(`Erro ao processar anúncio ${ad.id}:`, error);
            ad.hasEnglishText = false;
            ad.englishConfidence = 0;
        }
    }
    
    return ads;
}

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
