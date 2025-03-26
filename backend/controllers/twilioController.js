const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

const client = twilio(accountSid, authToken);

const sendSMS = async (to, body) => {
    try {
        const response = await client.messages.create({
            body,
            from: twilioPhoneNumber,
            to,
        });
        return response;
    } catch (error) {
        console.error('Error sending SMS:', error);
        throw error;
    }
};

module.exports = { sendSMS };
