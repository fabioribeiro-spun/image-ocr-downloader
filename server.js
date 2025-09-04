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

// Rota para buscar anúncios REAIS (simulados mas personalizados)
app.get('/api/ads/:advertiserId', async (req, res) => {
    try {
        const { advertiserId } = req.params;
        const { region = 'anywhere' } = req.query;
        
        console.log(`📦 Buscando anúncios para: ${advertiserId}, região: ${region}`);
        
        // Gerar dados simulados mas REALISTAS baseados no ID
        const ads = generateRealisticAds(advertiserId, region);
        
        res.json({ 
            success: true,
            ads: ads,
            total: ads.length,
            advertiserId: advertiserId,
            region: region,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Erro:', error);
        res.status(500).json({ 
            success: false,
            error: error.message,
            ads: getFallbackAds()
        });
    }
});

// Gerar anúncios REALISTAS baseados no ID
function generateRealisticAds(advertiserId, region) {
    const baseNumber = parseInt(advertiserId.replace(/\D/g, '').slice(-6)) || 100000;
    const adCount = (baseNumber % 6) + 2; // 2-7 anúncios
    
    const ads = [];
    const regions = region === 'BR' ? 
        ['Brasil', 'São Paulo', 'Rio de Janeiro'] : 
        ['Estados Unidos', 'Reino Unido', 'Canadá', 'Austrália', 'Global'];
    
    const formats = ['image', 'video', 'carousel'];
    const industries = ['Tecnologia', 'E-commerce', 'Saúde', 'Educação', 'Finanças', 'Viagens'];
    
    for (let i = 1; i <= adCount; i++) {
        const adNumber = baseNumber + i;
        const industry = industries[adNumber % industries.length];
        const format = formats[adNumber % formats.length];
        const hasEnglish = region !== 'BR' || Math.random() > 0.7;
        
        ads.push({
            id: `AD-${advertiserId.slice(-8)}-${adNumber}`,
            title: hasEnglish ? 
                `${industry} Campaign ${adNumber}` : 
                `Campanha de ${industry} ${adNumber}`,
            description: hasEnglish ?
                `Promoting ${industry} solutions across ${region}. Unique engagement opportunities available.` :
                `Promovendo soluções de ${industry} na região ${region}. Oportunidades únicas de engajamento.`,
            imageUrl: `https://picsum.photos/400/300?random=${adNumber}&blur=2`,
            date: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR'),
            regions: [regions[adNumber % regions.length]],
            format: format,
            hasEnglishText: hasEnglish,
            englishConfidence: hasEnglish ? 80 + (adNumber % 20) : adNumber % 30,
            advertiserId: advertiserId,
            metrics: {
                impressions: Math.floor(Math.random() * 1000000),
                clicks: Math.floor(Math.random() * 10000),
                ctr: (Math.random() * 5 + 1).toFixed(2) + '%'
            }
        });
    }
    
    return ads;
}

// Dados de fallback
function getFallbackAds() {
    return [{
        id: "fallback-1",
        title: "Example Campaign",
        description: "Sample advertisement for testing purposes",
        imageUrl: "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=400&h=300&fit=crop",
        date: new Date().toLocaleDateString('pt-BR'),
        regions: ["Global"],
        format: "image",
        hasEnglishText: true,
        englishConfidence: 95
    }];
}

// Rota de saúde
app.get('/api/health', (req, res) => {
    res.json({ 
        status: '✅ ONLINE',
        message: 'Servidor operacional',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// Rota de teste para seus IDs específicos
app.get('/api/debug/:advertiserId', (req, res) => {
    const { advertiserId } = req.params;
    const { region = 'anywhere' } = req.query;
    
    res.json({
        debug: true,
        advertiserId: advertiserId,
        region: region,
        suggestedUrl: `https://adstransparency.google.com/advertiser/${advertiserId}?region=${region}`,
        generatedAds: generateRealisticAds(advertiserId, region).length,
        status: 'active'
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📊 Ambiente: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 Health: http://localhost:${PORT}/api/health`);
    console.log(`🔍 Exemplo: http://localhost:${PORT}/api/ads/AR09499274345038479361`);
    console.log(`🐛 Debug: http://localhost:${PORT}/api/debug/AR15466515195282587649`);
});
