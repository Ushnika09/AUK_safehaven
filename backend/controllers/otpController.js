const db = require('../config/db');
const crypto = require('crypto');

// Generate OTP
const generateOtp = (userId, callback) => {
    const otpCode = crypto.randomInt(100000, 999999).toString(); // 6-digit OTP
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // Expiry: 5 minutes
    const query = `
        INSERT INTO otp_verifications (user_id, otp_code, expires_at)
        VALUES (?, ?, ?)
    `;
    db.query(query, [userId, otpCode, expiresAt], callback);
};

// Verify OTP
const verifyOtp = (userId, otpCode, callback) => {
    const query = `
        SELECT * FROM otp_verifications
        WHERE user_id = ? AND otp_code = ? AND expires_at > NOW() AND verified = 'no'
    `;
    db.query(query, [userId, otpCode], (err, results) => {
        if (err) return callback(err);

        if (results.length > 0) {
            const updateQuery = `
                UPDATE otp_verifications SET verified = 'yes'
                WHERE id = ?
            `;
            db.query(updateQuery, [results[0].id], callback);
        } else {
            callback(null, false); // OTP is invalid or expired
        }
    });
};

module.exports = { generateOtp, verifyOtp };
