const express = require('express');
const router = express.Router();
const { getAlerts, markAsRead, deleteAlerts, createCustomAlert, sendEmailAlert } = require('../controllers/alertController');
const { auth } = require('../middleware/auth');

router.use(auth);
router.get('/', getAlerts);
router.post('/', createCustomAlert);
router.put('/read', markAsRead);
router.delete('/', deleteAlerts);
router.post('/:alertId/email', sendEmailAlert);

module.exports = router;
