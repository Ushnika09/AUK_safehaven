

document.addEventListener("DOMContentLoaded", () => {
    // Get form elements
    const loginForm = document.getElementById('login-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const submitButton = document.querySelector('.btn-primary');
    const buttonText = submitButton.querySelector('.button-text');
    const loadingSpinner = submitButton.querySelector('.loading-spinner');
    const messageContainer = document.getElementById('message-container');
    const themeToggle = document.getElementById('theme-toggle');

    // Password visibility toggle
    const togglePassword = document.getElementById('toggle-password');
    togglePassword?.addEventListener('click', (e) => {
        e.preventDefault();
        const type = passwordInput.type === 'password' ? 'text' : 'password';
        passwordInput.type = type;
        togglePassword.querySelector('i').className = 
            `fas fa-${type === 'password' ? 'eye' : 'eye-slash'}`;
        passwordInput.focus();
    });

    // Prevent toggle password button from taking focus
    togglePassword?.addEventListener('mousedown', (e) => {
        e.preventDefault();
    });
  
    // Prevent form submission on Enter key unless focused on input
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
            e.preventDefault();
        }
    });

    // Prevent theme toggle from submitting form
    themeToggle?.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
    });

    // Form submission - Modified to include admin login
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
  
        // Clear previous messages
        messageContainer.innerHTML = '';
  
        // Validate form
        const email = emailInput.value.trim();
        const password = passwordInput.value;
  
        if (!email || !password) {
            showMessage('Please fill in all fields', 'error');
            return;
        }
  
        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showMessage('Please enter a valid email address', 'error');
            return;
        }
  
        // Password validation
        if (password.length < 6) {
            showMessage('Password must be at least 6 characters', 'error');
            return;
        }
  
        try {
            // Show loading state only after validation passes
            submitButton.disabled = true;
            buttonText.style.display = 'none';
            loadingSpinner.hidden = false;

            // ========== NEW ADMIN LOGIN CHECK ==========
            const ADMIN_EMAILS = ['aiman@gmail.com', 'kamla@gmail.com'];
            const ADMIN_PASSWORD = '111111'; // Change this to your secure password
            
            // Check if admin credentials match
            if (ADMIN_EMAILS.includes(email.toLowerCase()) && password === ADMIN_PASSWORD) {
                // Create admin session
                const adminToken = "admin-auth-token"; // Simple token for demo
                sessionStorage.setItem('adminAuth', adminToken);
                sessionStorage.setItem('adminEmail', email);
                
                
                
                showMessage('Admin login successful! Redirecting...', 'success');
                setTimeout(() => {
                    window.location.href = 'admin.html';
                }, 1500);
                return;
            }
            // ========== END OF ADMIN CHECK ==========

            // Existing regular user login flow
            const response = await fetch('http://localhost:3000/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email,
                    password,
                    remember: document.getElementById('remember').checked
                })
            });
  
            const data = await response.json();
  
            if (response.ok) {
                // Store auth data
                localStorage.setItem('token', data.token);
                localStorage.setItem('user_id', data.user_id);


                 // Store all auth data properly
                 sessionStorage.setItem('adminAuth', data.token);
                 sessionStorage.setItem('refreshToken', data.refreshToken);
                 sessionStorage.setItem('adminEmail', email);
            
                // Verify token storage
                const token = localStorage.getItem('token');
                if (!token) {
                    throw new Error('Failed to store authentication token.');
                }
                
                showMessage('Login successful! Redirecting...', 'success');
                setTimeout(() => {
                    window.location.href = 'home.html';
                }, 1500);
            } else {
                throw new Error(data.message || 'Invalid credentials');
            }
        } catch (error) {
            showMessage(error.message, 'error');
        } finally {
            // Reset button state
            submitButton.disabled = false;
            buttonText.style.display = 'block';
            loadingSpinner.hidden = true;
        }
    });
  
    function showMessage(message, type) {
        messageContainer.innerHTML = `
            <div class="message message-${type}">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
                ${message}
            </div>
        `;
    }
  
    // Social login handlers
    const socialButtons = document.querySelectorAll('.btn-social');
    socialButtons.forEach(button => {
        button.addEventListener('click', () => {
            showMessage(`${button.textContent.trim()} login coming soon!`, 'info');
        });
    });

    // Theme toggle functionality (if not already in theme-toggle.js)
    themeToggle?.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        themeToggle.textContent = newTheme === 'light' ? '🌙' : '☀️';
    });
});