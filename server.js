const express = require('express');
const cors = require('cors');
const path = require('path');

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
        
        // Dados simulados
        const ads = getSampleAds();
        
        // Simular processamento OCR
        const processedAds = processAdsWithOCR(ads);
        
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

// Dados de exemplo
function getSampleAds() {
    return [
        {
            id: 1,
            title: "Summer Special Offer",
            description: "Enjoy our exclusive discounts for the season. Limited time only!",
            imageUrl: "https://via.placeholder.com/300x200/4285F4/FFFFFF?text=Summer+Sale",
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
            imageUrl: "https://via.placeholder.com/300x200/34A853/FFFFFF?text=New+Product",
            date: "2023-08-02",
            regions: ["United States", "Canada"],
            format: "image",
            hasEnglishText: true,
            englishConfidence: 92
        }
    ];
}

// Simular OCR
function processAdsWithOCR(ads) {
    console.log("Simulando processamento OCR...");
    return ads.map(ad => {
        // Simular detecção de inglês
        ad.hasEnglishText = ad.title.match(/[a-zA-Z]/) && !ad.title.match(/[à-üÀ-Ü]/);
        ad.englishConfidence = ad.hasEnglishText ? Math.floor(Math.random() * 30) + 70 : Math.floor(Math.random() * 20);
        return ad;
    });
}

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📊 Ambiente: ${process.env.NODE_ENV || 'development'}`);
});
