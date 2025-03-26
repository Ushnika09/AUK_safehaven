// Mobile Menu Toggle
const menuIcon = document.getElementById('menu-icon');
const closeMenu = document.getElementById('close-menu');
const navLinks = document.getElementById('navLinks');

if (menuIcon && closeMenu && navLinks) {
    menuIcon.addEventListener('click', () => {
        navLinks.classList.add('active');
    });

    closeMenu.addEventListener('click', () => {
        navLinks.classList.remove('active');
    });
}

// Handle smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;
        
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            // Close mobile menu if open
            if (navLinks) {
                navLinks.classList.remove('active');
            }
            
            const headerHeight = document.querySelector('header').offsetHeight;
            const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - headerHeight;
            
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        }
    });
});

// Safety Tips Carousel
const tipSlides = document.querySelectorAll('.tip-slide');
const indicators = document.querySelectorAll('.indicator');
const prevTip = document.getElementById('prev-tip');
const nextTip = document.getElementById('next-tip');

if (tipSlides.length > 0 && indicators.length > 0) {
    let currentSlide = 0;

    // Function to show a specific slide
    function showSlide(index) {
        // Remove active class from all slides
        tipSlides.forEach(slide => {
            slide.classList.remove('active');
        });
        
        // Remove active class from all indicators
        indicators.forEach(ind => {
            ind.classList.remove('active');
        });
        
        // Show the specific slide and indicator
        tipSlides[index].classList.add('active');
        indicators[index].classList.add('active');
        
        // Update current slide
        currentSlide = index;
    }

    // Event listeners for prev and next buttons
    if (prevTip && nextTip) {
        prevTip.addEventListener('click', () => {
            let newIndex = currentSlide - 1;
            if (newIndex < 0) {
                newIndex = tipSlides.length - 1;
            }
            showSlide(newIndex);
        });

        nextTip.addEventListener('click', () => {
            let newIndex = currentSlide + 1;
            if (newIndex >= tipSlides.length) {
                newIndex = 0;
            }
            showSlide(newIndex);
        });
    }

    // Event listeners for indicators
    indicators.forEach((indicator, index) => {
        indicator.addEventListener('click', () => {
            showSlide(index);
        });
    });

    // Auto rotate slides every 5 seconds
    setInterval(() => {
        let newIndex = currentSlide + 1;
        if (newIndex >= tipSlides.length) {
            newIndex = 0;
        }
        showSlide(newIndex);
    }, 5000);
}

// Resource Tabs
const tabButtons = document.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('.tab-panel');

if (tabButtons.length > 0 && tabPanels.length > 0) {
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons and panels
            tabButtons.forEach(btn => {
                btn.classList.remove('active');
            });
            tabPanels.forEach(panel => {
                panel.classList.remove('active');
            });
            
            // Add active class to clicked button
            button.classList.add('active');
            
            // Show corresponding panel
            const tabId = button.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
        });
    });
}

// Contact Form Submission
const contactForm = document.getElementById('contactForm');
const formStatus = document.getElementById('formStatus');

if (contactForm && formStatus) {
    contactForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Get form data
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const subject = document.getElementById('subject').value;
        const message = document.getElementById('message').value;
        
        // Form validation
        if (!name || !email || !message) {
            formStatus.textContent = 'Please fill in all required fields.';
            formStatus.className = 'form-status error';
            return;
        }
        
        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            formStatus.textContent = 'Please enter a valid email address.';
            formStatus.className = 'form-status error';
            return;
        }
        
        // Simulate form submission (in a real app, you would send to a server)
        setTimeout(() => {
            // Display success message
            formStatus.textContent = 'Your message has been sent successfully. We will get back to you soon!';
            formStatus.className = 'form-status success';
            
            // Reset form
            contactForm.reset();
            
            // Hide message after 5 seconds
            setTimeout(() => {
                formStatus.style.display = 'none';
            }, 5000);
        }, 1000);
    });
}

// Newsletter Subscription
const newsletterForm = document.getElementById('newsletterForm');

if (newsletterForm) {
    newsletterForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const emailInput = this.querySelector('input[type="email"]');
        const email = emailInput.value;
        
        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            alert('Please enter a valid email address.');
            return;
        }
        
        // Simulate subscription (in a real app, you would send to a server)
        alert('Thank you for subscribing to our newsletter!');
        
        // Reset form
        newsletterForm.reset();
    });
}

// Add animations when elements come into view
const animateOnScroll = () => {
    const elements = document.querySelectorAll('.feature-card, .testimonial-card, .resource-card');
    
    elements.forEach(element => {
        const elementPosition = element.getBoundingClientRect().top;
        const screenPosition = window.innerHeight;
        
        if (elementPosition < screenPosition - 100) {
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        }
    });
};

// Set initial styles for animated elements
document.querySelectorAll('.feature-card, .testimonial-card, .resource-card').forEach(element => {
    element.style.opacity = '0';
    element.style.transform = 'translateY(30px)';
    element.style.transition = 'all 0.5s ease';
});

// Listen for scroll events
window.addEventListener('scroll', animateOnScroll);
window.addEventListener('load', animateOnScroll);

// Preloader
window.addEventListener('load', function() {
    const preloader = document.createElement('div');
    preloader.className = 'preloader';
    preloader.innerHTML = `
        <div class="spinner"></div>
    `;
    
    document.body.appendChild(preloader);
    
    // Add styles for preloader
    const style = document.createElement('style');
    style.textContent = `
        .preloader {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: #fff;
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            transition: opacity 0.5s, visibility 0.5s;
        }
        
        .spinner {
            width: 50px;
            height: 50px;
            border: 5px solid var(--primary-light);
            border-top: 5px solid var(--primary-color);
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    
    document.head.appendChild(style);
    
    // Remove preloader after page loads
    setTimeout(() => {
        preloader.style.opacity = '0';
        preloader.style.visibility = 'hidden';
        
        setTimeout(() => {
            preloader.remove();
        }, 500);
    }, 800);
});

// Back to Top Button
const createBackToTopButton = () => {
    const backToTopBtn = document.createElement('button');
    backToTopBtn.innerHTML = `<i class="fas fa-arrow-up"></i>`;
    backToTopBtn.className = 'back-to-top';
    document.body.appendChild(backToTopBtn);
    
    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        .back-to-top {
            position: fixed;
            bottom: 30px;
            right: 30px;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            background-color: var(--primary-color);
            color: white;
            border: none;
            cursor: pointer;
            display: flex;
            justify-content: center;
            align-items: center;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s ease;
            z-index: 99;
        }
        
        .back-to-top.visible {
            opacity: 1;
            visibility: visible;
        }
        
        .back-to-top:hover {
            background-color: var(--primary-dark);
            transform: translateY(-5px);
        }
        
        @media (max-width: 768px) {
            .back-to-top {
                width: 40px;
                height: 40px;
                bottom: 20px;
                right: 20px;
            }
        }
    `;
    
    document.head.appendChild(style);
    
    // Show/hide button based on scroll position
    window.addEventListener('scroll', () => {
        if (window.pageYOffset > 300) {
            backToTopBtn.classList.add('visible');
        } else {
            backToTopBtn.classList.remove('visible');
        }
    });
    
    // Scroll to top when clicked
    backToTopBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
};

// Create back to top button
createBackToTopButton();

// Initialize any components on page load
document.addEventListener('DOMContentLoaded', function() {
    // Make sure the first tab is active by default
    if (tabButtons.length > 0 && tabPanels.length > 0) {
        tabButtons[0].classList.add('active');
        tabPanels[0].classList.add('active');
    }
    
    // Run initial animation check
    animateOnScroll();
});

// Enhanced scroll reveal animation
const scrollReveal = () => {
    const elements = document.querySelectorAll('.feature-card, .testimonial-card, .resource-card, .tip-slide');
    
    elements.forEach(element => {
        const elementTop = element.getBoundingClientRect().top;
        const elementBottom = element.getBoundingClientRect().bottom;
        
        if (elementTop < window.innerHeight - 100 && elementBottom > 0) {
            element.classList.add('animate');
        }
    });
};

// Smooth section transitions
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;

        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            targetElement.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Enhanced carousel animation
const animateCarousel = (current, next) => {
    current.style.transform = 'translateX(-100%)';
    current.style.opacity = '0';
    next.style.transform = 'translateX(0)';
    next.style.opacity = '1';
};

// Initialize animations
window.addEventListener('load', () => {
    scrollReveal();
    document.body.style.opacity = '1';
});

window.addEventListener('scroll', scrollReveal);

// Add animation class when element enters viewport
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('animate');
        }
    });
}, observerOptions);

document.querySelectorAll('.feature-card, .testimonial-card, .resource-card').forEach(element => {
    observer.observe(element);
});

// Dynamic text animation for hero heading
const initDynamicText = () => {
    const heroHeading = document.querySelector('.hero-content h1');
    const words = ['Safety', 'Confidence', 'Support', 'Security'];
    let currentWord = 0;

    const updateText = () => {
        const word = words[currentWord];
        heroHeading.innerHTML = `Empowering Women Through <span class="highlight">${word}</span>`;
        currentWord = (currentWord + 1) % words.length;
    };

    // Add highlight style
    const style = document.createElement('style');
    style.textContent = `
        .highlight {
            color: var(--primary-color);
            display: inline-block;
            animation: slideIn 0.5s ease;
        }

        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
    `;
    document.head.appendChild(style);

    updateText();
    setInterval(updateText, 3000);
};
   // Optimize Spline viewer loading
   const splineViewer = document.querySelector('spline-viewer');
    
   if (splineViewer) {
       // Add loading indicator
       const loadingIndicator = document.createElement('div');
       loadingIndicator.className = 'loading-indicator';
       loadingIndicator.innerHTML = '<span>Loading 3D Model...</span>';
       
       splineViewer.parentNode.appendChild(loadingIndicator);
       
       // Remove loading indicator when Spline is loaded
       splineViewer.addEventListener('load', function() {
           loadingIndicator.style.opacity = '0';
           setTimeout(() => {
               loadingIndicator.remove();
           }, 500);
       });
   }
// Initialize hero section enhancements
document.addEventListener('DOMContentLoaded', () => {
    initDynamicText();
});

// Login Button Click Handler
const loginBtn = document.querySelector('.login-btn');
if (loginBtn) {
    loginBtn.addEventListener('click', () => {
        window.location.href = 'login.html';
    });
}

// Enhanced Feature Cards Animation
const initFeatureCards = () => {
    const cards = document.querySelectorAll('.feature-card');
    
    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            const rotateX = (y - centerY) / 20;
            const rotateY = (centerX - x) / 20;
            
            card.style.transform = `
                perspective(1000px)
                rotateX(${rotateX}deg)
                rotateY(${rotateY}deg)
                translateZ(10px)
            `;
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateZ(0)';
        });
    });
};

// Enhanced Safety Tips Carousel
const enhancedTipSlides = () => {
    const slides = document.querySelectorAll('.tip-slide');
    const controls = document.querySelector('.carousel-controls');
    
    const updateSlide = (index) => {
        slides.forEach(slide => {
            slide.classList.remove('active', 'inactive');
            slide.style.transform = 'translateX(100%)';
        });
        
        slides[index].classList.add('active');
        slides[index].style.transform = 'translateX(0)';
        
        if (index > 0) {
            slides[index - 1].classList.add('inactive');
        }
    };
    
    if (controls) {
        controls.addEventListener('mousemove', (e) => {
            const rect = controls.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const xc = rect.width / 2;
            const yc = rect.height / 2;
            
            const dx = x - xc;
            const dy = y - yc;
            
            controls.style.transform = `perspective(1000px) rotateX(${dy / 20}deg) rotateY(${dx / 20}deg)`;
        });
        
        controls.addEventListener('mouseleave', () => {
            controls.style.transform = 'perspective(1000px) rotateX(0) rotateY(0)';
        });
    }
};

// Initialize enhanced animations
document.addEventListener('DOMContentLoaded', () => {
    initFeatureCards();
    enhancedTipSlides();
});

// Create floating navigation
const createFloatingNav = () => {
    const nav = document.createElement('div');
    nav.className = 'floating-nav';
    
    const sections = ['home', 'features', 'safety-tips', 'resources', 'contact'];
    sections.forEach(section => {
        const dot = document.createElement('div');
        dot.className = 'floating-nav-dot';
        dot.setAttribute('data-tooltip', section.replace('-', ' ').toUpperCase());
        dot.addEventListener('click', () => {
            document.getElementById(section).scrollIntoView({ behavior: 'smooth' });
        });
        nav.appendChild(dot);
    });
    
    document.body.appendChild(nav);
};

// Initialize revolutionary features
document.addEventListener('DOMContentLoaded', () => {
    createFloatingNav();
});

// Initialize animations
document.addEventListener('DOMContentLoaded', () => {
    // Make sure the first tab is active by default
    if (tabButtons.length > 0 && tabPanels.length > 0) {
        tabButtons[0].classList.add('active');
        tabPanels[0].classList.add('active');
    }
    
    // Run initial animation check
    animateOnScroll();
    
    // Feature cards scroll animation
    const featureCards = document.querySelectorAll('.feature-card');
    const animateFeatureCards = () => {
        featureCards.forEach((card, index) => {
            const cardTop = card.getBoundingClientRect().top;
            const screenPosition = window.innerHeight * 0.85;
            
            if (cardTop < screenPosition) {
                card.style.opacity = '1';
                card.style.transform = 'translateX(0)';
            }
        });
    };

    // Set initial state for feature cards
    featureCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateX(-50px)';
        card.style.transition = `all 0.5s ease ${index * 0.2}s`;
    });

    // Add scroll event listener for feature cards
    window.addEventListener('scroll', animateFeatureCards);
    // Run once to check initial state
    animateFeatureCards();
});

// Enhanced Feature Cards Animation with Scroll Reveal
const initFeatureCardsAnimation = () => {
    const options = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const featureCardsObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('reveal');
                observer.unobserve(entry.target); // Stop observing once animated
            }
        });
    }, options);

    // Observe all feature cards
    document.querySelectorAll('.feature-card').forEach(card => {
        featureCardsObserver.observe(card);
    });
};

// Initialize animations
document.addEventListener('DOMContentLoaded', () => {
    // Make sure the first tab is active by default
    if (tabButtons.length > 0 && tabPanels.length > 0) {
        tabButtons[0].classList.add('active');
        tabPanels[0].classList.add('active');
    }
    
    // Run initial animation check
    animateOnScroll();
    initFeatureCardsAnimation();
});

// Remove or comment out these functions
// function handleScroll() { ... }
// const handleHeaderScroll = () => { ... }
// window.addEventListener('scroll', handleScroll);
// window.addEventListener('scroll', handleHeaderScroll);

// Remove or comment out these functions
// const createParticleEffect = () => { ... };
// const createMorphingBackground = () => { ... };

document.addEventListener('DOMContentLoaded', () => {
    // Remove createParticleEffect() and createMorphingBackground() calls
    initDynamicText();
    initFeatureCards();
    enhancedTipSlides();
    createFloatingNav();
});