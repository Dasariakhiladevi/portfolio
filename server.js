require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { Resend } = require('resend');

const app = express();
const DEFAULT_PORT = Number(process.env.PORT) || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'messages.json');
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Helper to get local network IP address dynamically
function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Find active Wi-Fi / Ethernet IPv4 addresses that are not internal loopbacks
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

let memoryMessages = [];

// Helper to read messages from JSON database or memory fallback
const readMessages = () => {
  if (process.env.VERCEL) {
    return memoryMessages;
  }
  try {
    if (!fs.existsSync(DATA_FILE)) {
      fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
      fs.writeFileSync(DATA_FILE, JSON.stringify([]));
      return [];
    }
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data || '[]');
  } catch (error) {
    console.error('Error reading messages file:', error);
    return [];
  }
};

// Helper to write messages to JSON database or memory fallback
const writeMessages = (messages) => {
  if (process.env.VERCEL) {
    memoryMessages = messages;
    return true;
  }
  try {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(messages, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing to messages file:', error);
    return false;
  }
};

// API: Get all messages
app.get('/api/messages', (req, res) => {
  const messages = readMessages();
  res.json(messages);
});

// API: Submit a new message
app.post('/api/messages', async (req, res) => {
  const { name, email, subject, message } = req.body;

  // Validation
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email, and message are required fields.' });
  }

  const messages = readMessages();
  const newMessage = {
    id: Date.now().toString(),
    name,
    email,
    subject: subject || 'No Subject',
    message,
    timestamp: new Date().toISOString()
  };

  messages.push(newMessage);
  const saved = writeMessages(messages);

  if (!saved) {
    return res.status(500).json({ error: 'Failed to save message on the server.' });
  }

  let emailStatus = 'Message saved successfully.';

  if (resend) {
    try {
      await resend.emails.send({
        from: process.env.RESEND_FROM || 'onboarding@resend.dev',
        to: process.env.RECEIVER_EMAIL || '4444akhiladevi.com@gmail.com',
        subject: `Portfolio contact form: ${subject || 'No Subject'}`,
        html: `
          <p><strong>New message from your portfolio contact form</strong></p>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Subject:</strong> ${subject || 'No Subject'}</p>
          <p><strong>Message:</strong></p>
          <p>${message.replace(/\n/g, '<br>')}</p>
        `,
      });
      emailStatus = 'Message saved successfully and email notification sent.';
    } catch (error) {
      console.error('Resend email error:', error);
      emailStatus = 'Message saved successfully, but email notification could not be sent.';
    }
  }

  res.status(201).json({
    success: true,
    message: emailStatus,
    data: newMessage
  });
});

// API: Delete a message by ID
app.delete('/api/messages/:id', (req, res) => {
  const { id } = req.params;
  const messages = readMessages();
  const filtered = messages.filter(msg => msg.id !== id);

  if (messages.length === filtered.length) {
    return res.status(404).json({ error: 'Message not found.' });
  }

  if (writeMessages(filtered)) {
    res.json({ success: true, message: 'Message deleted successfully.' });
  } else {
    res.status(500).json({ error: 'Failed to delete message on the server.' });
  }
});

// Catch-all route to serve the index.html page
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
if (!process.env.VERCEL) {
  const startServer = (port) => {
    const server = app.listen(port, '0.0.0.0', () => {
      const localIp = getLocalIpAddress();
      console.log(`================================================================`);
      console.log(` 💻 Server is running on your local network:`);
      console.log(`   - Localhost:       http://localhost:${port}`);
      if (localIp !== 'localhost') {
        console.log(`   - Other Devices:   http://${localIp}:${port} (Mobiles, Laptops)`);
      }
      console.log(` `);
      console.log(` 📱 Connect other devices (phones/tablets) to the same Wi-Fi network`);
      console.log(`    and open the link above to view your portfolio!`);
      console.log(`================================================================`);
    });

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.warn(`Port ${port} is busy. Trying ${port + 1} instead...`);
        startServer(port + 1);
      } else {
        console.error('Failed to start server:', error);
        process.exit(1);
      }
    });
  };

  startServer(DEFAULT_PORT);
}

module.exports = app;
