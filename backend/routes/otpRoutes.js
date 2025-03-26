const express = require('express');
const { generateOtp, verifyOtp } = require('../controllers/otpController');

const router = express.Router();

router.post('/generate', (req, res) => {
    const { userId } = req.body;
    generateOtp(userId, (err) => {
        if (err) return res.status(500).json({ error: 'Failed to generate OTP' });
        res.json({ message: 'OTP sent successfully' });
    });
});

router.post('/verify', (req, res) => {
    const { userId, otpCode } = req.body;
    verifyOtp(userId, otpCode, (err, success) => {
        if (err) return res.status(500).json({ error: 'Failed to verify OTP' });
        if (!success) return res.status(400).json({ error: 'Invalid or expired OTP' });
        res.json({ message: 'OTP verified successfully' });
    });
});

module.exports = router;
