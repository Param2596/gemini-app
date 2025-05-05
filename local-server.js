const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS
app.use(cors());

// Serve static files from the root directory
app.use(express.static('./'));

// Create a local API endpoint that mirrors the Vercel serverless function
app.get('/api/getKey', (req, res) => {
  // Check if API key exists in environment
  if (!process.env.GEMINI_API_KEY) {
    console.error('ERROR: GEMINI_API_KEY not set in environment or .env file');
    return res.status(500).json({ error: 'API key not configured' });
  }
  
  console.log('Local API endpoint: Returning API key from .env file');
  return res.status(200).json({ apiKey: process.env.GEMINI_API_KEY });
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
  ========================================================
  🚀 Local development server running at http://localhost:${PORT}
  
  ✅ API endpoint /api/getKey is available locally
  
  Make sure your .env file has GEMINI_API_KEY set
  ========================================================
  `);
});