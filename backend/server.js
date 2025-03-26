require('dotenv').config();
const express = require("express");
const bcrypt = require("bcryptjs");
const mysql = require("mysql2");
const twilio = require("twilio");

const app = express();
const port = 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database Connection
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

db.connect((err) => {
    if (err) {
        console.error("❌ Database connection error:", err);
        process.exit(1);
    }
    console.log("✅ Connected to MySQL Database.");
});

// Twilio Configuration
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
const client = twilio(accountSid, authToken);

// Generate OTP
function generateOTP(length = 6) {
    const digits = "0123456789";
    let otp = "";
    for (let i = 0; i < length; i++) {
        otp += digits[Math.floor(Math.random() * 10)];
    }
    return otp;
}

// Send OTP API
app.post("/api/otp/send", (req, res) => {
    const { phone } = req.body;

    if (!phone) {
        return res.status(400).json({ success: false, message: "Phone number is required" });
    }

    const otp = generateOTP();
    const expiry = new Date(Date.now() + 5 * 60 * 1000); // OTP expires in 5 minutes

    // Insert or update OTP in the database
    const query = `
        INSERT INTO otp_verifications (phone, otp_code, expires_at)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE otp_code = ?, expires_at = ?, verified = 'no';
    `;

    db.execute(query, [phone, otp, expiry, otp, expiry], (err) => {
        if (err) {
            return res.status(500).json({ success: false, message: "Database error", error: err.message });
        }

        // Send OTP via Twilio
        client.messages.create({
            body: `Your OTP is: ${otp}`,
            from: twilioPhoneNumber,
            to: phone
        }).then(() => {
            res.json({ success: true, message: "OTP sent successfully" });
        }).catch((error) => {
            res.status(500).json({ success: false, message: "Failed to send OTP", error: error.message });
        });
    });
});

// Verify OTP API
app.post("/api/otp/verify", (req, res) => {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
        return res.status(400).json({ success: false, message: "Phone and OTP are required" });
    }

    // Check if OTP is valid and not expired
    const query = `
        SELECT * FROM otp_verifications
        WHERE phone = ? AND otp_code = ? AND expires_at > NOW() AND verified = 'no';
    `;

    db.execute(query, [phone, otp], (err, results) => {
        if (err) {
            return res.status(500).json({ success: false, message: "Database error", error: err.message });
        }

        if (results.length === 0) {
            return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
        }

        // Mark OTP as verified
        db.execute("UPDATE otp_verifications SET verified = 'yes' WHERE phone = ?", [phone], (err) => {
            if (err) {
                return res.status(500).json({ success: false, message: "Database error", error: err.message });
            }

            res.json({ success: true, message: "OTP verified successfully" });
        });
    });
});

// User Registration API
app.post("/api/auth/register", (req, res) => {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !phone || !password) {
        return res.status(400).json({ success: false, message: "All fields are required" });
    }

    // Check if OTP is verified
    const otpQuery = "SELECT * FROM otp_verifications WHERE phone = ? AND verified = 'yes';";
    db.execute(otpQuery, [phone], (err, results) => {
        if (err) {
            return res.status(500).json({ success: false, message: "Database error", error: err.message });
        }

        if (results.length === 0) {
            return res.status(400).json({ success: false, message: "OTP not verified" });
        }

        // Hash password
        const hashedPassword = bcrypt.hashSync(password, 10);

        // Insert user into database
        const userQuery = "INSERT INTO users (name, email, phone, password) VALUES (?, ?, ?, ?);";
        db.execute(userQuery, [name, email, phone, hashedPassword], (err) => {
            if (err) {
                if (err.code === "ER_DUP_ENTRY") {
                    return res.status(400).json({ success: false, message: "Email or phone already exists" });
                }
                return res.status(500).json({ success: false, message: "Database error", error: err.message });
            }

            // Delete OTP record after successful registration
            db.execute("DELETE FROM otp_verifications WHERE phone = ?", [phone], (err) => {
                if (err) {
                    console.error("Error deleting OTP record:", err);
                }
            });

            res.json({ success: true, message: "Registration successful" });
        });
    });
});


// ✅ User Login API
app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    db.execute("SELECT * FROM users WHERE email = ?", [email], (err, results) => {
        if (err) return res.status(500).json({ success: false, message: "Database error", error: err });

        if (results.length === 0) {
            return res.status(401).json({ success: false, message: "Invalid email or password" });
        }

        const user = results[0];
        const isPasswordValid = bcrypt.compareSync(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({ success: false, message: "Invalid email or password" });
        }

        res.json({ success: true, message: "Login successful", user: { id: user.id, name: user.name, email: user.email } });
    });
});

// ✅ Incident Report Submission API
app.post("/submit-report", upload.single("media"), (req, res) => {
    try {
        const { 
            incident_title, date_time, latitude, longitude, 
            crime_type, description, severity, people_involved, 
            injured, reported, anonymous 
        } = req.body;

        const peopleInvolvedInt = people_involved ? parseInt(people_involved, 10) : 0;
        const injuredEnum = injured === "yes" ? "yes" : "no";
        const reportedEnum = reported === "yes" ? "yes" : "no";
        const anonymousEnum = anonymous === "yes" ? "yes" : "no";
        const media_path = req.file ? req.file.path : null;

        const sql = `INSERT INTO incident_reports 
            (incident_title, date_time, latitude, longitude, crime_type, description, severity, people_involved, injured, reported, anonymous, media_path)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        const values = [
            incident_title, date_time, latitude, longitude,
            crime_type, description, severity, peopleInvolvedInt,
            injuredEnum, reportedEnum, anonymousEnum, media_path
        ];

        db.execute(sql, values, (err, result) => {
            if (err) return res.status(500).json({ success: false, error: "Database error" });
            res.json({ success: true, message: "Report submitted successfully" });
        });
    } catch (error) {
        res.status(500).json({ success: false, error: "Server error", details: error.message });
    }
});


// Start Server
app.listen(port, () => {
    console.log(`🚀 Server running on http://localhost:${port}`);
});