require('dotenv').config();
const express = require("express");
const bcrypt = require("bcryptjs");
const mysql = require("mysql2");
const twilio = require("twilio");
const multer = require("multer");
const path = require("path");

const app = express();
const port = 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const cors = require("cors");


// Accept all origins during development
const corsOptions = {
    origin: true, // or use function for dynamic control
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  };
app.use(cors(corsOptions));



// // Enable CORS for all routes
// app.use(cors());

// File Upload Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname);
    }
});

const upload = multer({ storage });

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
            console.error("Database Error:", err);
            return res.status(500).json({ success: false, message: "Database error", error: err.message });
        }

        // Send OTP via Twilio
        client.messages.create({
            body: `Welcome to SafeHaven,first step towarda safety.Your registration OTP is: ${otp}`,
            from: twilioPhoneNumber,
            to: phone
        })
        .then(() => {
            res.json({ success: true, message: "OTP sent successfully" });
        })
        .catch((error) => {
            console.error("Twilio Error:", error); // Log the full error
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

// ✅ Check Unique Email and Phone
app.post("/api/auth/check-unique", (req, res) => {
    const { email, phone } = req.body;

    // Check if email is unique
    db.execute("SELECT * FROM users WHERE email = ?", [email], (err, emailResults) => {
        if (err) {
            return res.status(500).json({ success: false, message: "Database error", error: err.message });
        }

        // Check if phone is unique
        db.execute("SELECT * FROM users WHERE phone = ?", [phone], (err, phoneResults) => {
            if (err) {
                return res.status(500).json({ success: false, message: "Database error", error: err.message });
            }

            res.json({
                success: true,
                isEmailUnique: emailResults.length === 0,
                isPhoneUnique: phoneResults.length === 0
            });
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





const jwt = require("jsonwebtoken");

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

        // Generate JWT token
        // In your login endpoint, ensure role is included:
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role || 'user' }, // Default to 'user' if role not set
            process.env.JWT_SECRET,
            { expiresIn: "8h" }
        );

        
        // Send response with token and user details
        res.json({
            success: true,
            message: "Login successful",
            token,               // Include the generated JWT token
            role: user.role,      // Include user role
            user_id: user.id      // Include user ID
        });
    });
});



// Incident Report Submission API

app.post("/submit-report", upload.single("media"), (req, res) => {
    try {
        console.log("📡 Received report submission request");

        const { 
            incident_title, date_time, latitude, longitude, 
            crime_type, description, severity, people_involved, 
            injured, reported, anonymous, user_id 
        } = req.body;

        console.log("📄 Request Body:", req.body);

        // Validate required fields
        const missingFields = [];
        if (!incident_title) missingFields.push("incident_title");
        if (!date_time) missingFields.push("date_time");
        if (!latitude) missingFields.push("latitude");
        if (!longitude) missingFields.push("longitude");
        if (!crime_type) missingFields.push("crime_type");
        if (!description) missingFields.push("description");
        if (!severity) missingFields.push("severity");
        if (!people_involved) missingFields.push("people_involved");
        if (!injured) missingFields.push("injured");
        if (!reported) missingFields.push("reported");
        if (!anonymous) missingFields.push("anonymous");
        if (!user_id) missingFields.push("user_id");

        if (missingFields.length > 0) {
            console.error("❌ Missing required fields:", missingFields.join(", "));
            return res.status(400).json({ 
                success: false, 
                error: "Missing required fields", 
                missingFields 
            });
        }

        // Validate date_time to ensure it is not in the future
        const currentDateTime = new Date();
        const reportDateTime = new Date(date_time);
        if (reportDateTime > currentDateTime) {
            console.error("❌ Date and time cannot be in the future");
            return res.status(422).json({ 
                success: false, 
                error: "Date and time cannot be in the future" 
            });
        }

        // Parse and validate people_involved
        const peopleInvolvedInt = parseInt(people_involved, 10);
        if (isNaN(peopleInvolvedInt)) {
            console.error("❌ Invalid number of people involved");
            return res.status(400).json({ 
                success: false, 
                error: "Invalid number of people involved" 
            });
        }

        // Validate injured, reported, and anonymous fields
        const injuredEnum = injured === "yes" ? "yes" : "no";
        const reportedEnum = reported === "yes" ? "yes" : "no";
        const anonymousEnum = anonymous === "yes" ? "yes" : "no";

        // Get the file path if a file was uploaded
        const media_path = req.file ? req.file.path : null;

        console.log("📄 Processed Data:", {
            incident_title, date_time, latitude, longitude,
            crime_type, description, severity, peopleInvolvedInt,
            injuredEnum, reportedEnum, anonymousEnum, media_path, user_id
        });

        const sql = `INSERT INTO incident_reports 
    (incident_title, date_time, latitude, longitude, crime_type, description, severity, people_involved, injured, reported, anonymous, media_path, user_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

const values = [
    incident_title, date_time, parseFloat(latitude), parseFloat(longitude),
    crime_type, description, severity, people_involved,
    injuredEnum, reportedEnum, anonymousEnum, media_path, parseInt(user_id, 10)
];

        db.execute(sql, values, (err, result) => {
            if (err) {
                console.error("❌ Database Error:", err);
                return res.status(500).json({ 
                    success: false, 
                    error: "Database error", 
                    details: err.message 
                });
            }

            console.log("✅ Report submitted successfully");
            res.json({ success: true, message: "Report submitted successfully" });
        });
    } catch (error) {
        console.error("❌ Server Error:", error);
        res.status(500).json({ 
            success: false, 
            error: "Server error", 
            details: error.message 
        });
    }
});

app.post("/api/auth/profile/picture", upload.single('picture'), (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;

        if (!req.file) {
            return res.status(400).json({ success: false, message: "No file uploaded" });
        }

        const profilePicturePath = req.file.path;

        // Update the user's profile picture in the database
        const query = "UPDATE profile SET profile_picture = ? WHERE user_id = ?";
        db.execute(query, [profilePicturePath, userId], (err) => {
            if (err) {
                return res.status(500).json({ success: false, message: "Database error", error: err.message });
            }

            res.json({ success: true, profilePicture: profilePicturePath });
        });
    } catch (error) {
        res.status(401).json({ success: false, message: "Invalid token" });
    }
});


app.delete("/api/auth/profile/picture", (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;

        // Update the user's profile picture to default in the database
        const query = "UPDATE profile SET profile_picture = ? WHERE user_id = ?";
        db.execute(query, ['images/default-profile.png', userId], (err) => {
            if (err) {
                return res.status(500).json({ success: false, message: "Database error", error: err.message });
            }

            res.json({ success: true, message: "Profile picture deleted successfully" });
        });
    } catch (error) {
        res.status(401).json({ success: false, message: "Invalid token" });
    }
});




app.get("/api/auth/profile", (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;

        // Fetch user profile data
        const query = `
            SELECT 
                u.id, u.name, u.email, u.phone, p.profile_picture
            FROM 
                users u
            LEFT JOIN 
                profile p ON u.id = p.user_id
            WHERE 
                u.id = ?;
        `;

        db.execute(query, [userId], (err, results) => {
            if (err) {
                return res.status(500).json({ success: false, message: "Database error", error: err.message });
            }

            if (results.length === 0) {
                return res.status(404).json({ success: false, message: "User not found" });
            }

            const user = results[0];
            res.json({ success: true, user });
        });
    } catch (error) {
        res.status(401).json({ success: false, message: "Invalid token" });
    }
});







app.post("/api/auth/refresh-token", (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(400).json({ success: false, message: "Refresh token is required" });
    }

    try {
        // Verify the refresh token
        const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

        // Issue a new access token
        const newToken = jwt.sign(
            { id: decoded.id, email: decoded.email },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({ success: true, token: newToken });
    } catch (error) {
        console.error("Refresh Token Error:", error);
        res.status(401).json({ success: false, message: "Invalid refresh token" });
    }
});

// Fetch User Reports API
app.get("/api/auth/user-reports", (req, res) => {
    console.log("🔍 Received request to fetch user reports"); // Debug log

    const token = req.headers.authorization?.split(' ')[1];
    console.log("🔑 Token extracted from headers:", token); // Debug log

    if (!token) {
        console.error("❌ No token provided. Returning 401 Unauthorized."); // Debug log
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    try {
        console.log("🔐 Verifying JWT token..."); // Debug log
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log("✅ Token verified. Decoded payload:", decoded); // Debug log

        const userId = parseInt(decoded.id, 10); // Ensure userId is an integer
        console.log("🆔 User ID extracted from token:", userId); // Debug log

        // Fetch all reports for the user
        const query = `
            SELECT 
                id, incident_title, date_time, latitude, longitude, crime_type, 
                description, severity, people_involved, injured, reported, anonymous, media_path
            FROM 
                incident_reports
            WHERE 
                user_id = ?
            ORDER BY 
                date_time DESC;
        `;

        console.log("📝 Prepared SQL query:", query); // Debug log
        console.log("🔢 Query parameters:", [userId]); // Debug log

        db.execute(query, [userId], (err, results) => {
            if (err) {
                console.error("❌ Database Error:", err); // Log the error
                return res.status(500).json({ success: false, message: "Database error", error: err.message });
            }

            console.log("✅ Query executed successfully. Results:", results); // Debug log
            res.json({ success: true, reports: results });
        });
    } catch (error) {
        console.error("❌ JWT Verification Error:", error); // Log the error
        res.status(401).json({ success: false, message: "Invalid token" });
    }
});



// Get report counts
app.get('/api/reports/count', async (req, res) => {
    console.log("[API] Fetching report counts");
    try {
        const { status } = req.query;
        
        let query = "SELECT COUNT(*) as count FROM incident_reports";
        const params = [];
        
        if (status) {
            query += " WHERE status = ?";
            params.push(status);
        }
        
        const [result] = await db.promise().execute(query, params);
        res.json({ success: true, count: result[0].count });
    } catch (error) {
        console.error("[API] Error counting reports:", error);
        res.status(500).json({ success: false, message: "Failed to count reports" });
    }
});

// Get user counts
app.get('/api/users/count', async (req, res) => {
    console.log("[API] Fetching user counts");
    try {
        const { status } = req.query;
        
        let query = "SELECT COUNT(*) as count FROM users";
        const params = [];
        
        if (status && status !== 'all') {
            query += " WHERE status = ?";
            params.push(status);
        }
        
        const [result] = await db.promise().execute(query, params);
        res.json({ success: true, count: result[0].count });
    } catch (error) {
        console.error("[API] Error counting users:", error);
        res.status(500).json({ success: false, message: "Failed to count users" });
    }
});

// Get report by ID
app.get('/api/reports/:id', (req, res) => {
    const { id } = req.params;
    db.execute(
        'SELECT * FROM incident_reports WHERE id = ?',
        [id],
        (err, results) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            if (results.length === 0) {
                return res.status(404).json({ error: 'Report not found' });
            }
            res.json({ report: results[0] });
        }
    );
});

// Update Report Status API
app.put("/api/reports/:id/status", (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    try {
        // Verify the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Check if the user is admin (only admins can change status)
        if (decoded.role !== 'admin') {
            return res.status(403).json({ success: false, message: "Forbidden: Admin access required" });
        }

        // Validate the status
        const validStatuses = ['pending', 'under_review', 'resolved', 'rejected'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ 
                success: false, 
                message: "Invalid status",
                validStatuses: validStatuses
            });
        }

        // Update the report status in the database
        const query = "UPDATE incident_reports SET status = ? WHERE id = ?";
        db.execute(query, [status, id], (err, results) => {
            if (err) {
                console.error("Database Error:", err);
                return res.status(500).json({ 
                    success: false, 
                    message: "Database error", 
                    error: err.message 
                });
            }

            if (results.affectedRows === 0) {
                return res.status(404).json({ 
                    success: false, 
                    message: "Report not found" 
                });
            }

            res.json({ 
                success: true, 
                message: `Report status updated to ${status}`,
                reportId: id,
                newStatus: status
            });
        });
    } catch (error) {
        console.error("JWT Error:", error);
        res.status(401).json({ success: false, message: "Invalid token" });
    }
});

// Database error handler/api/reports/
db.on('error', (err) => {
    console.error('Database error:', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
        // Reconnect if connection is lost
        db.connect();
    }
});







app.post('/api/auth/refresh', (req, res) => {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
        return res.status(400).json({ success: false, message: "Refresh token required" });
    }

    try {
        const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
        const newToken = jwt.sign(
            { id: decoded.id, email: decoded.email, role: decoded.role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );
        
        res.json({ success: true, token: newToken });
    } catch (error) {
        res.status(401).json({ success: false, message: "Invalid refresh token" });
    }
});




// Single Report Endpoint
app.get('/api/reports/:id', verifyAdmin, (req, res) => {
    const { id } = req.params;
    
    db.execute(
        `SELECT r.*, u.name as user_name, u.email as user_email
         FROM incident_reports r
         JOIN users u ON r.user_id = u.id
         WHERE r.id = ?`,
        [id],
        (err, results) => {
            if (err) {
                return res.status(500).json({ 
                    success: false, 
                    message: "Database error",
                    error: err.message 
                });
            }
            
            if (results.length === 0) {
                return res.status(404).json({ 
                    success: false, 
                    message: "Report not found" 
                });
            }
            
            res.json({ 
                success: true, 
                report: results[0] 
            });
        }
    );
});




// Delete Report Endpoint
app.delete('/api/reports/:id', (req, res) => {
    const { id } = req.params;
    
    // First delete associated media file if exists
    db.execute(
        'SELECT media_path FROM incident_reports WHERE id = ?',
        [id],
        (err, results) => {
            if (err) {
                return res.status(500).json({ 
                    success: false,
                    message: "Database error",
                    error: err.message 
                });
            }
            
            if (results.length === 0) {
                return res.status(404).json({ 
                    success: false,
                    message: "Report not found" 
                });
            }
            
            const report = results[0];
            
            // Delete the report
            db.execute(
                'DELETE FROM incident_reports WHERE id = ?',
                [id],
                (err, results) => {
                    if (err) {
                        return res.status(500).json({ 
                            success: false,
                            message: "Database error",
                            error: err.message 
                        });
                    }
                    
                    // Delete media file if exists
                    if (report.media_path) {
                        const fs = require('fs');
                        const path = require('path');
                        const filePath = path.join(__dirname, report.media_path);
                        
                        fs.unlink(filePath, (err) => {
                            if (err) {
                                console.error("Error deleting media file:", err);
                            }
                        });
                    }
                    
                    res.json({ 
                        success: true,
                        message: "Report deleted successfully" 
                    });
                }
            );
        }
    );
});

// Get all reports with filtering and search
// Get all reports with filtering and search
app.get('/api/reports/all', verifyAdmin, async (req, res) => {
    try {
        const { status, crime_type, date, search } = req.query;
        
        let query = `
            SELECT 
                r.id, r.incident_title, r.date_time, r.latitude, r.longitude, 
                r.crime_type, r.description, r.severity, r.people_involved, 
                r.injured, r.reported, r.anonymous, r.media_path, r.status, 
                u.name as user_name
            FROM incident_reports r
            JOIN users u ON r.user_id = u.id
            WHERE 1=1
        `;
        
        const params = [];
        
        if (status && status !== 'all') {
            query += " AND r.status = ?";
            params.push(status);
        }
        
        if (crime_type && crime_type !== 'all') {
            query += " AND r.crime_type = ?";
            params.push(crime_type);
        }
        
        if (date) {
            query += " AND DATE(r.date_time) = ?";
            params.push(date);
        }
        
        if (search) {
            query += " AND (r.incident_title LIKE ? OR r.description LIKE ? OR u.name LIKE ?)";
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }
        
        query += " ORDER BY r.date_time DESC";
        
        console.log("[API] Executing query:", query, "with params:", params);
        const [reports] = await db.promise().execute(query, params);
        console.log("[API] Reports fetched:", reports.map(r => ({ id: r.id, status: r.status })));
        
        res.json({ success: true, reports });
    } catch (error) {
        console.error("[API] Error fetching reports:", error);
        res.status(500).json({ success: false, message: "Failed to fetch reports" });
    }
});

// Token Refresh Endpoint
app.post('/api/auth/refresh', (req, res) => {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
        return res.status(400).json({ success: false, message: "Refresh token required" });
    }

    try {
        const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
        const newToken = jwt.sign(
            { id: decoded.id, email: decoded.email, role: decoded.role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );
        
        res.json({ 
            success: true, 
            token: newToken,
            refreshToken: refreshToken // Or generate new refresh token
        });
    } catch (error) {
        res.status(401).json({ success: false, message: "Invalid refresh token" });
    }
});









// Admin verification middleware
// Admin verification middleware
function verifyAdmin(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Check if user is admin
        if (decoded.role !== 'admin') {
            return res.status(403).json({ success: false, message: "Forbidden: Admin access required" });
        }
        
        req.user = decoded;
        next();
    } catch (error) {
        // Handle different JWT errors specifically
        if (error instanceof jwt.TokenExpiredError) {
            return res.status(401).json({ 
                success: false, 
                message: "Token expired",
                error: error.message 
            });
        }
        
        if (error instanceof jwt.JsonWebTokenError) {
            return res.status(401).json({ 
                success: false, 
                message: "Invalid token",
                error: error.message 
            });
        }
        
        res.status(401).json({ success: false, message: "Authentication failed" });
    }
}



app.put("/api/reports/:id/status", verifyAdmin, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    try {
        // Validate status
        const validStatuses = ['pending', 'under_review', 'resolved', 'rejected'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ 
                success: false, 
                message: "Invalid status",
                validStatuses 
            });
        }

        // Update in database
        const [result] = await db.promise().execute(
            'UPDATE incident_reports SET status = ? WHERE id = ?',
            [status, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                success: false, 
                message: "Report not found" 
            });
        }

        res.json({ 
            success: true, 
            message: `Report status updated to ${status}`,
            reportId: id,
            newStatus: status
        });

    } catch (error) {
        console.error("Report status update error:", error);
        res.status(500).json({ 
            success: false, 
            message: "Failed to update report status",
            error: error.message 
        });
    }
});

const { Parser } = require('json2csv');

// Export Reports as CSV
app.get('/api/reports/export', verifyAdmin, async (req, res) => {
    try {
        console.log("[API] Exporting reports as CSV");
        
        // Fetch all reports with user names
        const query = `
            SELECT 
                r.id, r.incident_title, r.date_time, r.latitude, r.longitude, 
                r.crime_type, r.description, r.severity, r.people_involved, 
                r.injured, r.reported, r.anonymous, r.media_path, r.status, 
                u.name as user_name
            FROM incident_reports r
            JOIN users u ON r.user_id = u.id
            ORDER BY r.date_time DESC
        `;
        
        const [reports] = await db.promise().execute(query);
        console.log("[API] Fetched reports:", reports.length);
        
        if (reports.length === 0) {
            console.log("[API] No reports found for export");
            return res.status(404).json({ success: false, message: "No reports found" });
        }
        
        // Define CSV fields
        const fields = [
            { label: 'ID', value: 'id' },
            { label: 'Title', value: 'incident_title' },
            { label: 'Date', value: 'date_time' },
            { label: 'Latitude', value: 'latitude' },
            { label: 'Longitude', value: 'longitude' },
            { label: 'Crime Type', value: 'crime_type' },
            { label: 'Description', value: 'description' },
            { label: 'Severity', value: 'severity' },
            { label: 'People Involved', value: 'people_involved' },
            { label: 'Injured', value: 'injured' },
            { label: 'Reported', value: 'reported' },
            { label: 'Anonymous', value: 'anonymous' },
            { label: 'Media Path', value: 'media_path' },
            { label: 'Status', value: 'status' },
            { label: 'User Name', value: 'user_name' }
        ];
        
        // Convert to CSV
        const json2csvParser = new Parser({ fields });
        const csv = json2csvParser.parse(reports);
        
        // Set response headers for CSV download
        res.header('Content-Type', 'text/csv');
        res.header('Content-Disposition', 'attachment; filename="reports_export.csv"');
        
        // Send CSV data
        res.send(csv);
    } catch (error) {
        console.error("[API] Error exporting reports:", error);
        res.status(500).json({ success: false, message: "Failed to export reports", error: error.message });
    }
});

// Start Server
app.listen(port, () => {
    console.log(`🚀 Server running on http://localhost:${port}`);
});

