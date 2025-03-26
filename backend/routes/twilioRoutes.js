// const express = require('express');
// const { sendSMS } = require('../controllers/twilioController');

// const router = express.Router();

// router.post('/send-sms', async (req, res) => {
//     const { phone, message } = req.body;

//     if (!phone || !message) {
//         return res.status(400).json({ error: 'Phone number and message are required.' });
//     }

//     try {
//         const response = await sendSMS(phone, message);
//         res.status(200).json({ message: 'SMS sent successfully', response });
//     } catch (error) {
//         res.status(500).json({ error: 'Failed to send SMS', details: error.message });
//     }
// });

// module.exports = router;


const express = require("express");
const router = express.Router();
const twilio = require("twilio");

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

// Send OTP
router.post("/send", async (req, res) => {
    const { phoneNumber, message } = req.body;

    if (!phoneNumber || !message) {
        return res.status(400).json({ success: false, message: "Phone number and message are required." });
    }

    try {
        const response = await client.messages.create({
            body: message,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: phoneNumber,
        });

        res.json({ success: true, message: "OTP sent successfully", sid: response.sid });
    } catch (error) {
        console.error("Error sending OTP:", error);
        res.status(500).json({ success: false, error: "Failed to send OTP." });
    }
});

module.exports = router;
