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

// Reusable Brevo API sender
function brevoSend(payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
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
          reject(new Error(`Brevo error: ${res.statusCode} - ${data}`));
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

  // 1 — Notify admin
  try {
    await brevoSend({
      sender: { name: 'AI Brain Portfolio', email: 'aibrain.lb@gmail.com' },
      to: [{ email: process.env.ADMIN_EMAIL || 'aibrain.lb@gmail.com' }],
      replyTo: { email: email, name: name },
      subject: `New Contact: ${name} - ${subject || 'Portfolio Inquiry'}`,
      htmlContent: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;border:1px solid #e0e0e0;border-radius:12px;">
          <h2 style="color:#0066FF;">New Contact Form Submission</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Subject:</strong> ${subject || 'Portfolio Inquiry'}</p>
          <p><strong>Message:</strong></p>
          <p style="background:#f9f9f9;padding:16px;border-radius:8px;">${message.replace(/\n/g, '<br>')}</p>
        </div>
      `
    });
    console.log('✅ Admin email sent!');
  } catch (err) {
    console.error('❌ Admin email error:', err.message);
  }

  // 2 — Thank you to user
  try {
    await brevoSend({
      sender: { name: 'AI Brain Portfolio', email: 'aibrain.lb@gmail.com' },
      to: [{ email: email, name: name }],
      subject: `Thanks for reaching out, ${name}! 🧠`,
      htmlContent: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;border:1px solid #e0e0e0;border-radius:12px;">
          <h2 style="color:#0066FF;">Thank you for contacting AI Brain! 🧠</h2>
          <p>Hi <strong>${name}</strong>,</p>
          <p>Thank you for reaching out! I have received your message and will get back to you within <strong>24-48 hours</strong>.</p>
          <p>In the meantime, feel free to check out my work:</p>
          <a href="https://ai-brain-cnqp.onrender.com" style="display:inline-block;padding:12px 24px;background:linear-gradient(135deg,#0066FF,#00D9FF);color:white;border-radius:8px;text-decoration:none;font-weight:bold;">Visit AI Brain Portfolio</a>
          <br><br>
          <p style="color:#718096;">Best regards,<br><strong>AI Brain</strong></p>
        </div>
      `
    });
    console.log('✅ Thank you email sent to user!');
  } catch (err) {
    console.error('❌ Thank you email error:', err.message);
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