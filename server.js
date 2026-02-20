const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public/
app.use(express.static(path.join(__dirname, 'public')));

// Email transporter setup
let transporter = null;

function createTransporter() {
  if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
    console.log('✅ Email transporter ready');
  } else {
    console.warn('⚠️  EMAIL_USER or EMAIL_PASSWORD not set — emails disabled');
  }
}

createTransporter();

// ── API Routes ──────────────────────────────────────────────

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    email: transporter ? 'enabled' : 'disabled',
  });
});

app.get('/api/config', (req, res) => {
  res.json({ logRequests: false });
});

app.post('/api/contact', async (req, res) => {
  const { name, email, subject, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({
      success: false,
      message: 'Please provide name, email, and message.',
    });
  }

  console.log(`📬 New contact from ${name} <${email}>`);

  // Send email if configured
  if (transporter) {
    try {
      await transporter.sendMail({
        from: `"AI Brain Portfolio" <${process.env.EMAIL_USER}>`,
        to: process.env.ADMIN_EMAIL || 'aibrain.lb@gmail.com',
        replyTo: email,
        subject: `📬 New Contact: ${name} — ${subject || 'Portfolio Inquiry'}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e0e0e0; border-radius: 12px;">
            <h2 style="color: #0066FF; margin-bottom: 24px;">New Contact Form Submission</h2>
            <table style="width:100%; border-collapse: collapse;">
              <tr><td style="padding:8px 0; font-weight:bold; color:#555;">Name:</td><td style="padding:8px 0;">${name}</td></tr>
              <tr><td style="padding:8px 0; font-weight:bold; color:#555;">Email:</td><td style="padding:8px 0;"><a href="mailto:${email}">${email}</a></td></tr>
              <tr><td style="padding:8px 0; font-weight:bold; color:#555;">Subject:</td><td style="padding:8px 0;">${subject || 'Portfolio Inquiry'}</td></tr>
            </table>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
            <p style="font-weight:bold; color:#555; margin-bottom:8px;">Message:</p>
            <p style="background:#f9f9f9; padding:16px; border-radius:8px; line-height:1.7;">${message.replace(/\n/g, '<br>')}</p>
            <p style="color:#999; font-size:0.8rem; margin-top:24px;">Sent from AI Brain Portfolio — ${new Date().toLocaleString()}</p>
          </div>
        `,
      });
      console.log('✅ Email sent to aibrain.lb@gmail.com');
    } catch (emailErr) {
      console.error('❌ Email send error:', emailErr.message);
      // Still return success to the user — message was received
    }
  }

  res.json({
    success: true,
    message: "Thank you for reaching out! I'll get back to you soon.",
  });
});

// ── SPA Fallback ─────────────────────────────────────────────
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, message: 'Not found' });
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Start ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 AI Brain server running on port ${PORT}`);
  console.log(`🌍 Env: ${process.env.NODE_ENV || 'development'}\n`);
});

module.exports = app;
