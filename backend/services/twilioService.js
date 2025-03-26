// const twilio = require('twilio');
// const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER } = process.env;

// const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

// const sendSMS = async (to, message) => {
//     try {
//         const response = await client.messages.create({
//             body: message,
//             from: TWILIO_PHONE_NUMBER,
//             to: to,
//         });
//         return response;
//     } catch (error) {
//         console.error('Error sending SMS:', error);
//         throw error;
//     }
// };

// module.exports = { sendSMS };


const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

const client = twilio(accountSid, authToken);

const sendSMS = async (to, body) => {
    return client.messages.create({
        body,
        from: twilioPhoneNumber,
        to
    });
};


app.post('/api/otp/send', (req, res) => {
    const { phoneNumber } = req.body;

    client.messages
        .create({
            body: `Your OTP code is: ${Math.floor(1000 + Math.random() * 9000)}`, // Random OTP
            from: process.env.TWILIO_PHONE_NUMBER,
            to: phoneNumber
        })
        .then(message => {
            console.log("Message SID:", message.sid); // ✅ Log Twilio message SID
            res.status(200).json({ success: true, message: 'OTP sent successfully' });
        })
        .catch(error => {
            console.error("Twilio Error:", error); // ❌ Log the error
            res.status(500).json({ success: false, error: 'Failed to send OTP', details: error.message });
        });
});

module.exports = { sendSMS };
