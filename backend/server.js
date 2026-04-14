require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// Trust the first proxy hop (Railway, etc.) so req.ip reflects the real client IP
app.set('trust proxy', 1);

app.use(cors());

// Stripe webhook MUST come before express.json() — needs raw body
app.use('/v1/webhook/stripe', require('./routes/webhook'));

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

app.use('/v1/memory', require('./routes/memory'));
app.use('/v1/agents', require('./routes/agents'));
app.use('/v1/admin',      require('./routes/admin'));
app.use('/v1/newsletter', require('./routes/newsletter'));

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'agentmemory' }));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`AgentMemory running on port ${PORT}`));
