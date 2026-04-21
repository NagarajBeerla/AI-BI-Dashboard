require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Simple Auth Middleware
const requireAuth = (req, res, next) => {
    const providedPass = req.headers['authorization'];
    const requiredPass = process.env.SAAS_PASSWORD;
    if (!requiredPass || (providedPass && providedPass.replace('Bearer ', '') === requiredPass)) {
        return next();
    }
    return res.status(401).json({ error: { message: "Invalid workspace password." }});
};

// Proxied LLM Endpoint
app.post('/api/analyze', requireAuth, async (req, res) => {
    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
        return res.status(500).json({ error: { message: "Server misconfiguration: Groq API Key missing." }});
    }

    try {
        const groqResp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${groqKey}`
            },
            // We blindly pass the JSON payload the frontend requested
            body: JSON.stringify(req.body)
        });
        
        const data = await groqResp.json();
        if (!groqResp.ok) {
            return res.status(groqResp.status).json(data);
        }
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: { message: "Failed to connect to Groq: " + err.message }});
    }
});

// Fallback all routes to index.html for SPA feeling
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});
