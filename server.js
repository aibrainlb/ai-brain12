const express = require('express');
const cors = require('cors');
const https = require('https');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

console.log('BREVO_API_KEY set:', !!process.env.BREVO_API_KEY);
console.log('ADMIN_EMAIL:', process.env.ADMIN_EMAIL);

// Send email via Brevo HTTP API (no SMTP ports needed)
function sendEmail({ name, email, subject, message }) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      sender: { name: 'AI Brain Portfolio', email: 'aibrain.lb@gmail.com' },
      to: [{ email: process.env.ADMIN_EMAIL || 'aibrain.lb@gmail.com' }],
      replyTo: { email: email, name: name },
      subject: `New Contact: ${name} - ${subject || 'Portfolio Inquiry'}`,
      htmlContent: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Subject:</strong> ${subject || 'Portfolio Inquiry'}</p>
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, '<br>')}</p>
      `
    });

    const options = {
      hostname: 'api.brevo.com',
      path: '/v3/smtp/email',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          reject(new Error(`Brevo API error: ${res.statusCode} - ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), email: 'enabled' });
});

app.get('/api/config', (req, res) => {
  res.json({ logRequests: false });
});

app.post('/api/contact', async (req, res) => {
  const { name, email, subject, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ success: false, message: 'Please provide name, email, and message.' });
  }

  console.log(`📬 New contact from ${name} <${email}>`);

  try {
    await sendEmail({ name, email, subject, message });
    console.log('✅ Email sent via Brevo API!');
  } catch (err) {
    console.error('❌ Brevo API error:', err.message);
  }

  res.json({ success: true, message: "Thank you! I'll get back to you soon." });
});

app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ success: false });
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 AI Brain running on port ${PORT}`);
});

module.exports = app;