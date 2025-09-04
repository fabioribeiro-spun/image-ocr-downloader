const express = require('express');
const cors = require('cors');
const path = require('path');
const Tesseract = require('tesseract.js');

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

// Rota para buscar anúncios
app.get('/api/ads/:advertiserId', async (req, res) => {
    try {
        const { advertiserId } = req.params;
        const { date, format, region, language } = req.query;
        
        console.log(`Buscando anúncios para: ${advertiserId}`);
        
        // Usando dados simulados (remover puppeteer por enquanto)
        const ads = getSampleAds();
        
        // Processar imagens com OCR para detectar texto em inglês
        const processedAds = await processAdsWithOCR(ads);
        
        res.json({ ads: processedAds });
    } catch (error) {
        console.error('Erro ao buscar anúncios:', error);
        res.status(500).json({ 
            error: error.message,
            message: "Usando dados simulados"
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
            // Simular OCR
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

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📊 Ambiente: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 Health check disponível em: http://localhost:${PORT}/api/health`);
});
