require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const os = require('os');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'messages.json');

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

// Setup Nodemailer SMTP Transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: process.env.SMTP_SECURE !== 'false', // default to true (port 465)
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Helper to read messages from JSON database
const readMessages = () => {
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

// Helper to write messages to JSON database
const writeMessages = (messages) => {
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
app.post('/api/messages', (req, res) => {
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
  if (writeMessages(messages)) {
    // ----------------------------------------------------
    // Nodemailer Email Forwarding Integration
    // ----------------------------------------------------
    const isEmailConfigured = 
      process.env.SMTP_USER && 
      process.env.SMTP_PASS && 
      process.env.SMTP_PASS !== 'xxxx_xxxx_xxxx_xxxx';

    if (isEmailConfigured) {
      const receiverEmail = process.env.RECEIVER_EMAIL || '4444akhiladevi.com@gmail.com';
      const mailOptions = {
        from: `"${name} (Portfolio)" <${process.env.SMTP_USER}>`,
        to: receiverEmail,
        replyTo: email,
        subject: `New Message: ${subject || 'No Subject'}`,
        text: `You have received a new message from your portfolio contact form.\n\n` +
              `-----------------------------------------------\n` +
              `Sender Details:\n` +
              `-----------------------------------------------\n` +
              `Name:    ${name}\n` +
              `Email:   ${email}\n` +
              `Subject: ${subject || 'No Subject'}\n\n` +
              `-----------------------------------------------\n` +
              `Message Body:\n` +
              `-----------------------------------------------\n` +
              `${message}\n\n` +
              `-----------------------------------------------\n` +
              `Note: This message is stored locally in database. ID: ${newMessage.id}`
      };

      // Send email asynchronously so user doesn't wait for SMTP handshakes
      transporter.sendMail(mailOptions, (mailErr, info) => {
        if (mailErr) {
          console.error('Nodemailer Error: Failed to send email forwarding.', mailErr.message);
        } else {
          console.log(`Email Forwarding Success: Message sent to ${receiverEmail}. Response: ${info.response}`);
        }
      });
    } else {
      console.log('Nodemailer Info: Email forwarding skipped. Add SMTP credentials in .env to enable.');
    }

    res.status(201).json({ success: true, message: 'Message saved successfully!', data: newMessage });
  } else {
    res.status(500).json({ error: 'Failed to save message on the server.' });
  }
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
app.listen(PORT, '0.0.0.0', () => {
  const localIp = getLocalIpAddress();
  console.log(`================================================================`);
  console.log(` 💻 Server is running on your local network:`);
  console.log(`   - Localhost:       http://localhost:${PORT}`);
  if (localIp !== 'localhost') {
    console.log(`   - Other Devices:   http://${localIp}:${PORT} (Mobiles, Laptops)`);
  }
  console.log(` `);
  console.log(` 📱 Connect other devices (phones/tablets) to the same Wi-Fi network`);
  console.log(`    and open the link above to view your portfolio!`);
  console.log(`================================================================`);
});
