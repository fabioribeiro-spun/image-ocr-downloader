[README.md](https://github.com/user-attachments/files/22158087/README.md)
# Ferramenta de Busca de Criativos com Texto em Inglês

Esta ferramenta permite buscar e fazer download de criativos do Google Ads Transparency que contenham texto em inglês.

## Funcionalidades

- Busca de criativos por ID de anunciante
- Filtros por data, formato, região e idioma
- Detecção de texto em inglês usando OCR
- Download de criativos selecionados

## Como usar

1. Insira o ID do anunciante do Google Ads Transparency (ex: AR09499274345038479361)
2. Ajuste os filtros conforme necessário
3. Clique em "Buscar Criativos"
4. Os criativos com texto em inglês serão marcados com um selo verde
5. Clique em "Download" para salvar qualquer criativo

## Instalação

1. Clone este repositório
2. Execute `npm install` para instalar as dependências
3. Execute `npm start` para iniciar o servidor
4. Acesse `http://localhost:3000` no navegador

## Estrutura do Projeto

- `public/index.html` - Frontend da aplicação
- `server.js` - Backend com API para scraping e OCR
- `package.json` - Dependências e scripts do projeto

## Tecnologias Utilizadas

- Node.js
- Express.js
- Puppeteer (para scraping)
- Tesseract.js (para OCR)
- HTML5/CSS3/JavaScript
