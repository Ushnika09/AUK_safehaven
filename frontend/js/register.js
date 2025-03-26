document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM fully loaded and parsed"); // Debugging log

    // Get all DOM elements
    const registerForm = document.getElementById("registerForm");
    const sendOTPBtn = document.getElementById("sendOTP");
    const verifyOTPBtn = document.getElementById("verifyOTP");
    const otpSection = document.getElementById("otpSection");
    const submitBtn = document.getElementById("submitBtn");
    const otpInput = document.getElementById("otp");
    const themeToggle = document.getElementById("theme-toggle");

    // Debugging: Log all elements to ensure they are correctly selected
    console.log("registerForm:", registerForm);
    console.log("sendOTPBtn:", sendOTPBtn);
    console.log("verifyOTPBtn:", verifyOTPBtn);
    console.log("otpSection:", otpSection);
    console.log("submitBtn:", submitBtn);
    console.log("otpInput:", otpInput);
    console.log("themeToggle:", themeToggle);

    let phone = ""; // Global variable to store the user's phone number

    // ✅ Theme Toggling
    if (themeToggle) {
        themeToggle.addEventListener("click", () => {
            const currentTheme = document.documentElement.getAttribute("data-theme");
            const newTheme = currentTheme === "light" ? "dark" : "light";
            document.documentElement.setAttribute("data-theme", newTheme);
            localStorage.setItem("theme", newTheme);
            themeToggle.textContent = newTheme === "light" ? "🌙" : "☀️";
            console.log("Theme toggled to:", newTheme); // Debugging log
        });
    } else {
        console.error("Theme toggle button not found!"); // Debugging log
    }

    // ✅ Send OTP
    if (sendOTPBtn) {
        sendOTPBtn.addEventListener("click", () => {
            console.log("Send OTP button clicked!"); // Debugging log

            const countryCode = document.getElementById("countryCode").value; // Get selected country code
            const phoneNumber = document.getElementById("phone").value.trim(); // Get phone number input

            if (!phoneNumber) {
                alert("❌ Please enter your phone number to send OTP.");
                return;
            }

            // Combine country code and phone number
            phone = countryCode + phoneNumber;
            console.log("Phone number being sent:", phone); // Debugging log

            // Disable the Send OTP button to prevent multiple requests
            sendOTPBtn.disabled = true;
            sendOTPBtn.textContent = "Sending OTP...";

            console.log("Sending OTP request to backend..."); // Debugging log
            console.log("Request URL:", "http://localhost:3000/api/otp/send"); // Debugging log
            console.log("Request Body:", JSON.stringify({ phone })); // Debugging log

            fetch("http://localhost:3000/api/otp/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone }),
            })
                .then((response) => {
                    console.log("Received response from backend:", response); // Debugging log
                    if (!response.ok) {
                        throw new Error(`HTTP error! Status: ${response.status}`);
                    }
                    return response.json();
                })
                .then((result) => {
                    console.log("Backend Response Data:", result); // Debugging log
                    if (result.success) {
                        alert(`✅ OTP sent successfully to ${phone}.`);
                        otpSection.style.display = "block"; // Show OTP input section
                        sendOTPBtn.style.display = "none"; // Hide Send OTP button
                        submitBtn.style.display = "none"; // Hide submit button until OTP is verified
                    } else {
                        alert("❌ Failed to send OTP: " + result.message);
                    }
                })
                .catch((error) => {
                    console.error("❌ Error sending OTP:", error); // Debugging log
                    alert("❌ Failed to send OTP. Please try again.");
                })
                .finally(() => {
                    sendOTPBtn.disabled = false;
                    sendOTPBtn.textContent = "Send OTP";
                });
        });
    } else {
        console.error("Send OTP button not found!"); // Debugging log
    }

    // ✅ Verify OTP
    if (verifyOTPBtn) {
        verifyOTPBtn.addEventListener("click", () => {
            console.log("Verify OTP button clicked!"); // Debugging log

            const userOTP = otpInput.value.trim();

            if (!userOTP) {
                alert("❌ Please enter the OTP.");
                return;
            }

            // Disable the Verify OTP button to prevent multiple requests
            verifyOTPBtn.disabled = true;
            verifyOTPBtn.textContent = "Verifying OTP...";

            console.log("Verifying OTP with backend..."); // Debugging log
            console.log("Request URL:", "http://localhost:3000/api/otp/verify"); // Debugging log
            console.log("Request Body:", JSON.stringify({ phone, otp: userOTP })); // Debugging log

            fetch("http://localhost:3000/api/otp/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone, otp: userOTP }),
            })
                .then((response) => {
                    console.log("Received response from backend:", response); // Debugging log
                    if (!response.ok) {
                        throw new Error(`HTTP error! Status: ${response.status}`);
                    }
                    return response.json();
                })
                .then((result) => {
                    console.log("Backend Response Data:", result); // Debugging log
                    if (result.success) {
                        alert("✅ OTP verified successfully!");
                        otpSection.style.display = "none"; // Hide OTP input section
                        submitBtn.style.display = "block"; // Show submit button after OTP verification
                    } else {
                        alert("❌ Invalid OTP. Please try again.");
                    }
                })
                .catch((error) => {
                    console.error("❌ Error verifying OTP:", error); // Debugging log
                    alert("❌ OTP verification failed. Please try again.");
                })
                .finally(() => {
                    verifyOTPBtn.disabled = false;
                    verifyOTPBtn.textContent = "Verify OTP";
                });
        });
    } else {
        console.error("Verify OTP button not found!"); // Debugging log
    }

    // ✅ Form Submission
    if (registerForm) {
        registerForm.addEventListener("submit", (e) => {
            e.preventDefault();
            console.log("Form submission initiated!"); // Debugging log

            const name = document.getElementById("name").value.trim();
            const email = document.getElementById("email").value.trim();
            const password = document.getElementById("password").value.trim();
            const confirmPassword = document.getElementById("confirmPassword").value.trim();

            // Validate inputs
            if (!name || !email || !phone || !password || !confirmPassword) {
                alert("❌ All fields are required!");
                return;
            }

            // Check password length
            if (password.length < 6) {
                alert("❌ Password must be at least 6 characters long.");
                return;
            }

            // Check if passwords match
            if (password !== confirmPassword) {
                alert("❌ Passwords do not match!");
                return;
            }

            // Disable the submit button to prevent multiple submissions
            submitBtn.disabled = true;
            submitBtn.textContent = "Registering...";

            console.log("Checking email and phone uniqueness..."); // Debugging log

            // Check if email and phone are unique
            fetch("http://localhost:3000/api/auth/check-unique", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, phone }),
            })
                .then((response) => {
                    console.log("Received response from backend:", response); // Debugging log
                    if (!response.ok) {
                        throw new Error(`HTTP error! Status: ${response.status}`);
                    }
                    return response.json();
                })
                .then((result) => {
                    console.log("Backend Response Data:", result); // Debugging log
                    if (!result.isEmailUnique) {
                        alert("❌ Email is already registered.");
                        return;
                    }
                    if (!result.isPhoneUnique) {
                        alert("❌ Phone number is already registered.");
                        return;
                    }

                    console.log("Proceeding with registration..."); // Debugging log

                    // Proceed with registration
                    fetch("http://localhost:3000/api/auth/register", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ name, email, phone, password }),
                    })
                        .then((response) => {
                            console.log("Received response from backend:", response); // Debugging log
                            if (!response.ok) {
                                throw new Error(`HTTP error! Status: ${response.status}`);
                            }
                            return response.json();
                        })
                        .then((result) => {
                            console.log("Backend Response Data:", result); // Debugging log
                            if (result.success) {
                                alert("✅ Registration successful!");
                                window.location.href = "login.html"; // Redirect to login page
                            } else {
                                alert("❌ Registration failed: " + result.message);
                            }
                        })
                        .catch((error) => {
                            console.error("❌ Error:", error); // Debugging log
                            alert("❌ Registration failed. Please try again.");
                        });
                })
                .catch((error) => {
                    console.error("❌ Error checking uniqueness:", error); // Debugging log
                    alert("❌ Failed to check email/phone uniqueness. Please try again.");
                })
                .finally(() => {
                    submitBtn.disabled = false;
                    submitBtn.textContent = "Register";
                });
        });
    } else {
        console.error("Register form not found!"); // Debugging log
    }
});