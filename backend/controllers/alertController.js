const Alert = require('../models/Alert');
const nodemailer = require('nodemailer');
const User = require('../models/User');

const getTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

exports.getAlerts = async (req, res) => {
  try {
    const { type, severity, isRead, page = 1, limit = 20 } = req.query;
    const filter = { userId: req.user._id };
    if (type) filter.type = type;
    if (severity) filter.severity = severity;
    if (isRead !== undefined) filter.isRead = isRead === 'true';

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [alerts, total, unreadCount] = await Promise.all([
      Alert.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      Alert.countDocuments(filter),
      Alert.countDocuments({ userId: req.user._id, isRead: false }),
    ]);

    res.json({ success: true, data: alerts, total, unreadCount, page: parseInt(page) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch alerts.' });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { ids } = req.body;
    const filter = { userId: req.user._id };
    if (ids && Array.isArray(ids)) filter._id = { $in: ids };

    await Alert.updateMany(filter, { isRead: true });
    res.json({ success: true, message: 'Alerts marked as read.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark alerts as read.' });
  }
};

exports.deleteAlerts = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) return res.status(400).json({ error: 'ids array required.' });
    await Alert.deleteMany({ _id: { $in: ids }, userId: req.user._id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete alerts.' });
  }
};

exports.createCustomAlert = async (req, res) => {
  try {
    const { type, title, message, severity, crop, state, threshold } = req.body;
    if (!type || !title || !message) {
      return res.status(400).json({ error: 'type, title, and message are required.' });
    }

    const alert = await Alert.create({
      userId: req.user._id,
      type: type || 'custom',
      title,
      message,
      severity: severity || 'medium',
      crop,
      state,
      threshold,
    });

    if (global.io) {
      global.io.emit('alert:new', { userId: req.user._id.toString(), alert });
    }

    res.status(201).json({ success: true, alert });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create alert.' });
  }
};

exports.sendEmailAlert = async (req, res) => {
  try {
    const { alertId } = req.params;
    const alert = await Alert.findOne({ _id: alertId, userId: req.user._id });
    if (!alert) return res.status(404).json({ error: 'Alert not found.' });

    const user = await User.findById(req.user._id);

    const transporter = getTransporter();
    await transporter.sendMail({
      from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
      to: user.email,
      subject: `[AgriInsight Pro] ${alert.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a1628; color: #fff; padding: 30px; border-radius: 12px;">
          <h1 style="color: #4ade80; margin-bottom: 5px;">🌾 AgriInsight Pro</h1>
          <h2 style="color: #fff; border-bottom: 1px solid #1e3a5f; padding-bottom: 15px;">${alert.title}</h2>
          <div style="background: #1e3a5f; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="font-size: 16px; line-height: 1.6; color: #cbd5e1;">${alert.message}</p>
          </div>
          <div style="display: flex; gap: 10px; margin: 15px 0;">
            <span style="background: ${alert.severity === 'critical' ? '#ef4444' : alert.severity === 'high' ? '#f97316' : '#eab308'}; 
              color: #fff; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold;">
              ${alert.severity.toUpperCase()}
            </span>
            ${alert.crop ? `<span style="background: #065f46; color: #4ade80; padding: 4px 12px; border-radius: 20px; font-size: 12px;">${alert.crop}</span>` : ''}
            ${alert.state ? `<span style="background: #1e3a5f; color: #60a5fa; padding: 4px 12px; border-radius: 20px; font-size: 12px;">${alert.state}</span>` : ''}
          </div>
          <p style="color: #64748b; font-size: 12px; margin-top: 30px;">
            Generated on ${new Date(alert.createdAt).toLocaleString()} | AgriInsight Pro Platform
          </p>
        </div>
      `,
    });

    await Alert.findByIdAndUpdate(alertId, { isEmailSent: true, emailSentAt: new Date() });

    res.json({ success: true, message: 'Email sent successfully.' });
  } catch (error) {
    console.error('Email error:', error);
    res.status(500).json({ error: 'Failed to send email alert.' });
  }
};
