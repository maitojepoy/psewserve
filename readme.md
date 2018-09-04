PSEi Data Extractor v0.1
========================

This node.js script basically extracts daily weekday data based on your given company watchlist. All data will be saved in your indicated Firebase RTDB server. This technology also uses Headless Chrome (Puppeteer) to open a session in the PSE website and gather data. This is specifically for Google Cloud Functions.