// Enhanced Hair Salon Website JavaScript - Mobile PWA Edition

// Initialize Stripe (replace with your publishable key)
const stripe = Stripe('pk_test_YOUR_PUBLISHABLE_KEY_HERE'); // Replace with actual key
const elements = stripe.elements();

// Global variables
let currentService = null;
let currentPrice = 0;
let cardElement = null;
let bookingData = null;
let touchStartX = 0;
let touchStartY = 0;
let isOnline = navigator.onLine;
let swipeThreshold = 50;
let portfolioSwipeIndex = 0;

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeWebsite();
    setupEventListeners();
    setupStripeElements();
    setupScrollAnimations();
    setupPortfolioFilters();
    setupMobileMenu();
    setupTouchGestures();
    setupImageLightbox();
    setupLazyLoading();
    setupOfflineHandling();
    setupStickyBookingButton();
    setupNativeSharing();
});

// Initialize website functionality
function initializeWebsite() {
    // Set minimum date for booking to tomorrow
    const dateInput = document.querySelector('input[name="date"]');
    if (dateInput) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        dateInput.min = tomorrow.toISOString().split('T')[0];
    }

    // Initialize scroll-based navigation
    window.addEventListener('scroll', handleScroll);
    
    // Initialize intersection observer for animations
    if ('IntersectionObserver' in window) {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };
        
        const observer = new IntersectionObserver(handleIntersection, observerOptions);
        document.querySelectorAll('.fade-in-up').forEach(el => observer.observe(el));
    }
}

// Setup event listeners
function setupEventListeners() {
    // Service booking buttons
    document.querySelectorAll('.book-service').forEach(button => {
        button.addEventListener('click', handleServiceBooking);
    });

    // Service select dropdown
    const serviceSelect = document.getElementById('service-select');
    if (serviceSelect) {
        serviceSelect.addEventListener('change', handleServiceChange);
    }

    // Booking form submission
    const bookingForm = document.getElementById('booking-form');
    if (bookingForm) {
        bookingForm.addEventListener('submit', handleBookingSubmission);
    }

    // Payment modal controls
    const cancelPayment = document.getElementById('cancel-payment');
    const submitPayment = document.getElementById('submit-payment');
    
    if (cancelPayment) {
        cancelPayment.addEventListener('click', closePaymentModal);
    }
    
    if (submitPayment) {
        submitPayment.addEventListener('click', processPayment);
    }

    // Navigation smooth scrolling
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', handleSmoothScroll);
    });
}

// Setup Stripe Elements
function setupStripeElements() {
    const cardElementContainer = document.getElementById('card-element');
    if (!cardElementContainer) return;

    const style = {
        base: {
            fontSize: '16px',
            color: '#424770',
            '::placeholder': {
                color: '#aab7c4',
            },
            fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
        },
        invalid: {
            color: '#9e2146',
        },
    };

    cardElement = elements.create('card', { style });
    cardElement.mount('#card-element');

    cardElement.on('change', ({error}) => {
        const displayError = document.getElementById('card-errors');
        if (displayError) {
            displayError.textContent = error ? error.message : '';
        }
    });
}

// Handle service booking from service cards
function handleServiceBooking(event) {
    event.preventDefault();
    const button = event.target;
    const service = button.dataset.service;
    const price = parseInt(button.dataset.price);
    
    // Update form with selected service
    const serviceSelect = document.getElementById('service-select');
    if (serviceSelect) {
        serviceSelect.value = service;
        handleServiceChange();
    }
    
    // Scroll to booking form
    document.getElementById('booking').scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
    });
}

// Handle service selection change
function handleServiceChange() {
    const serviceSelect = document.getElementById('service-select');
    const priceDisplay = document.getElementById('price-display');
    const priceAmount = document.getElementById('price-amount');
    
    if (!serviceSelect || !priceDisplay || !priceAmount) return;
    
    const selectedOption = serviceSelect.options[serviceSelect.selectedIndex];
    if (selectedOption && selectedOption.dataset.price) {
        currentPrice = parseInt(selectedOption.dataset.price);
        currentService = selectedOption.value;
        
        priceAmount.textContent = currentPrice;
        priceDisplay.classList.remove('hidden');
        priceDisplay.style.display = 'block';
    } else {
        priceDisplay.classList.add('hidden');
        priceDisplay.style.display = 'none';
        currentPrice = 0;
        currentService = null;
    }
}

// Handle booking form submission
async function handleBookingSubmission(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    // Validate form
    if (!validateBookingForm(formData)) {
        return;
    }
    
    // Prepare booking data
    bookingData = {
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        service: formData.get('service'),
        date: formData.get('date'),
        time: formData.get('time'),
        notes: formData.get('notes'),
        price: currentPrice
    };
    
    // Show payment modal
    showPaymentModal();
}

// Validate booking form
function validateBookingForm(formData) {
    const required = ['firstName', 'lastName', 'email', 'phone', 'service', 'date', 'time'];
    const errors = [];
    
    for (const field of required) {
        if (!formData.get(field)) {
            errors.push(`${field.charAt(0).toUpperCase() + field.slice(1)} is required`);
        }
    }
    
    // Validate email format
    const email = formData.get('email');
    if (email && !isValidEmail(email)) {
        errors.push('Please enter a valid email address');
    }
    
    // Validate date is in future
    const selectedDate = new Date(formData.get('date'));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate <= today) {
        errors.push('Please select a future date');
    }
    
    if (errors.length > 0) {
        showErrorMessage(errors.join('\n'));
        return false;
    }
    
    return true;
}

// Email validation helper
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Show payment modal
function showPaymentModal() {
    const modal = document.getElementById('payment-modal');
    if (modal) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
}

// Close payment modal
function closePaymentModal() {
    const modal = document.getElementById('payment-modal');
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }
}

// Process payment
async function processPayment() {
    if (!bookingData || !cardElement) {
        showErrorMessage('Payment information is missing');
        return;
    }
    
    const submitButton = document.getElementById('submit-payment');
    setLoadingState(submitButton, true);
    
    try {
        // Create payment method
        const {error, paymentMethod} = await stripe.createPaymentMethod({
            type: 'card',
            card: cardElement,
            billing_details: {
                name: `${bookingData.firstName} ${bookingData.lastName}`,
                email: bookingData.email,
                phone: bookingData.phone,
            },
        });
        
        if (error) {
            throw new Error(error.message);
        }
        
        // In a real implementation, you would send this to your server
        // For demo purposes, we'll simulate a successful payment
        await simulatePaymentProcessing(paymentMethod.id);
        
        // Show success and close modal
        showSuccessMessage('Payment successful! Your appointment has been booked.');
        closePaymentModal();
        resetBookingForm();
        
    } catch (error) {
        showErrorMessage(`Payment failed: ${error.message}`);
    } finally {
        setLoadingState(submitButton, false);
    }
}

// Simulate payment processing (replace with actual server call)
async function simulatePaymentProcessing(paymentMethodId) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            // Simulate 90% success rate
            if (Math.random() > 0.1) {
                console.log('Booking created:', {
                    ...bookingData,
                    paymentMethodId,
                    status: 'confirmed',
                    bookingId: generateBookingId()
                });
                resolve();
            } else {
                reject(new Error('Payment processing failed'));
            }
        }, 2000);
    });
}

// Generate booking ID
function generateBookingId() {
    return 'BK' + Date.now().toString(36).toUpperCase();
}

// Reset booking form
function resetBookingForm() {
    const form = document.getElementById('booking-form');
    if (form) {
        form.reset();
        const priceDisplay = document.getElementById('price-display');
        if (priceDisplay) {
            priceDisplay.classList.add('hidden');
        }
    }
    
    currentService = null;
    currentPrice = 0;
    bookingData = null;
}

// Setup portfolio filters
function setupPortfolioFilters() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    const portfolioItems = document.querySelectorAll('.portfolio-item');
    
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            const filter = button.dataset.filter;
            
            // Update active button
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Filter items
            portfolioItems.forEach(item => {
                if (filter === 'all' || item.classList.contains(filter)) {
                    item.classList.remove('hidden');
                } else {
                    item.classList.add('hidden');
                }
            });
        });
    });
}

// Setup mobile menu
function setupMobileMenu() {
    const hamburger = document.querySelector('.hamburger-menu');
    if (hamburger) {
        hamburger.addEventListener('click', toggleMobileMenu);
    }
}

// Toggle mobile menu
function toggleMobileMenu() {
    // Create mobile menu if it doesn't exist
    let mobileMenu = document.querySelector('.mobile-menu');
    if (!mobileMenu) {
        mobileMenu = createMobileMenu();
        document.body.appendChild(mobileMenu);
    }
    
    mobileMenu.classList.toggle('active');
    document.body.style.overflow = mobileMenu.classList.contains('active') ? 'hidden' : 'auto';
}

// Create mobile menu
function createMobileMenu() {
    const mobileMenu = document.createElement('div');
    mobileMenu.className = 'mobile-menu';
    
    const links = [
        { href: '#about', text: 'About' },
        { href: '#services', text: 'Services' },
        { href: '#portfolio', text: 'Portfolio' },
        { href: '#testimonials', text: 'Reviews' },
        { href: '#booking', text: 'Book Now' }
    ];
    
    links.forEach(link => {
        const a = document.createElement('a');
        a.href = link.href;
        a.textContent = link.text;
        a.addEventListener('click', () => {
            mobileMenu.classList.remove('active');
            document.body.style.overflow = 'auto';
        });
        mobileMenu.appendChild(a);
    });
    
    return mobileMenu;
}

// Handle smooth scrolling
function handleSmoothScroll(event) {
    event.preventDefault();
    const targetId = event.target.getAttribute('href');
    const targetElement = document.querySelector(targetId);
    
    if (targetElement) {
        const offsetTop = targetElement.offsetTop - 80; // Account for fixed nav
        window.scrollTo({
            top: offsetTop,
            behavior: 'smooth'
        });
    }
}

// Handle scroll events
function handleScroll() {
    const nav = document.querySelector('nav');
    if (nav) {
        if (window.scrollY > 100) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }
    }
}

// Setup scroll animations
function setupScrollAnimations() {
    const animatedElements = document.querySelectorAll('section');
    animatedElements.forEach(el => {
        el.classList.add('fade-in-up');
    });
}

// Handle intersection observer for animations
function handleIntersection(entries) {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        }
    });
}

// Utility Functions
function setLoadingState(element, isLoading) {
    if (isLoading) {
        element.classList.add('loading');
        element.disabled = true;
    } else {
        element.classList.remove('loading');
        element.disabled = false;
    }
}

function showSuccessMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'success-message';
    messageDiv.textContent = message;
    
    const container = document.querySelector('#booking') || document.body;
    container.insertBefore(messageDiv, container.firstChild);
    
    setTimeout(() => {
        messageDiv.remove();
    }, 5000);
}

function showErrorMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'error-message';
    messageDiv.textContent = message;
    
    const container = document.querySelector('#booking') || document.body;
    container.insertBefore(messageDiv, container.firstChild);
    
    setTimeout(() => {
        messageDiv.remove();
    }, 5000);
}

// Server Communication Functions (for future implementation)
async function createBookingOnServer(bookingData) {
    try {
        const response = await fetch('/api/bookings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(bookingData),
        });
        
        if (!response.ok) {
            throw new Error('Failed to create booking');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Booking creation failed:', error);
        throw error;
    }
}

async function processPaymentOnServer(paymentData) {
    try {
        const response = await fetch('/api/payments/process', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(paymentData),
        });
        
        if (!response.ok) {
            throw new Error('Payment processing failed');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Payment processing failed:', error);
        throw error;
    }
}

// Analytics and tracking (for future implementation)
function trackEvent(eventName, properties = {}) {
    // Google Analytics or other tracking service
    if (typeof gtag !== 'undefined') {
        gtag('event', eventName, properties);
    }
    
    console.log('Event tracked:', eventName, properties);
}

// AI Chatbot Integration Placeholder
function initializeChatbot() {
    // This will be implemented when the AI chatbot is ready
    console.log('AI Chatbot integration ready for implementation');
    
    // Future implementation will include:
    // - Chat widget initialization
    // - Vidal Sassoon knowledge base integration
    // - Style recommendation engine
    // - Appointment booking through chat
    // - Price estimation based on chat conversation
}

// Performance monitoring
function monitorPerformance() {
    if ('performance' in window) {
        window.addEventListener('load', () => {
            const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
            console.log('Page load time:', loadTime + 'ms');
            
            // Track Core Web Vitals
            if ('web-vitals' in window) {
                // Implementation for web vitals tracking
            }
        });
    }
}

// Initialize performance monitoring
monitorPerformance();

// ===== DELIGHTFUL ENHANCEMENTS =====

// Vidal Sassoon Quotes for Easter Eggs
const vidalQuotes = [
    "The only place where success comes before work is in the dictionary.",
    "Hair is another name for sex.",
    "The cut is a tool with which to make your statement.",
    "My greatest satisfaction is to see a woman's hair blow in the wind.",
    "Never compromise on your beliefs or your hair.",
    "A woman who cuts her hair is about to change her life.",
    "Hair is the first thing. And teeth the second.",
    "The essence of hair is simplicity.",
    "Good hair speaks louder than words.",
    "Hair is your best accessory."
];

let currentQuoteIndex = 0;
let visitCount = 0;
let konamiSequence = [];
const konamiCode = [38, 38, 40, 40, 37, 39, 37, 39, 66, 65]; // Up Up Down Down Left Right Left Right B A

// Initialize delightful features
function initializeDelightfulFeatures() {
    createScrollProgressBar();
    initializeParticleSystem();
    setupVidalQuoteReveal();
    setupKonamiCode();
    trackVisitorReturn();
    setupPlayfulFormValidation();
    addGeometricOverlays();
    setupHappyCursor();
    initializeScrollRevealAnimations();
    setupStarRatingInteractions();
    console.log('✨ Delightful features activated! ✨');
}

// Create floating scroll progress bar
function createScrollProgressBar() {
    const progressBar = document.createElement('div');
    progressBar.className = 'scroll-progress';
    progressBar.innerHTML = '<div class="scroll-progress-bar"></div>';
    document.body.appendChild(progressBar);
    
    const progressBarFill = progressBar.querySelector('.scroll-progress-bar');
    
    window.addEventListener('scroll', () => {
        const scrollTop = window.pageYOffset;
        const docHeight = document.body.scrollHeight - window.innerHeight;
        const scrollPercent = (scrollTop / docHeight) * 100;
        progressBarFill.style.width = scrollPercent + '%';
    });
}

// Initialize floating particles system
function initializeParticleSystem() {
    const hero = document.querySelector('header');
    if (!hero) return;
    
    const particleContainer = document.createElement('div');
    particleContainer.className = 'hero-particles';
    hero.appendChild(particleContainer);
    
    // Create different types of particles
    function createParticle() {
        const particle = document.createElement('div');
        const types = ['particle', 'particle scissors', 'particle comb'];
        const randomType = types[Math.floor(Math.random() * types.length)];
        
        particle.className = randomType;
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 15 + 's';
        particle.style.animationDuration = (15 + Math.random() * 10) + 's';
        
        particleContainer.appendChild(particle);
        
        // Remove particle after animation
        setTimeout(() => {
            if (particle.parentNode) {
                particle.parentNode.removeChild(particle);
            }
        }, 25000);
    }
    
    // Create particles periodically
    setInterval(createParticle, 3000);
    
    // Create initial burst
    for (let i = 0; i < 5; i++) {
        setTimeout(createParticle, i * 1000);
    }
}

// Setup Vidal Sassoon quote reveals on scroll milestones
function setupVidalQuoteReveal() {
    let lastRevealTime = 0;
    const revealCooldown = 10000; // 10 seconds between quotes
    
    window.addEventListener('scroll', () => {
        const now = Date.now();
        if (now - lastRevealTime < revealCooldown) return;
        
        const scrollPercent = (window.pageYOffset / (document.body.scrollHeight - window.innerHeight)) * 100;
        
        // Reveal quotes at specific scroll milestones
        if (scrollPercent > 25 && scrollPercent < 30 || 
            scrollPercent > 50 && scrollPercent < 55 || 
            scrollPercent > 75 && scrollPercent < 80) {
            
            showVidalQuote();
            lastRevealTime = now;
        }
    });
}

// Show hidden Vidal Sassoon quote
function showVidalQuote() {
    const quote = vidalQuotes[currentQuoteIndex % vidalQuotes.length];
    currentQuoteIndex++;
    
    const quoteElement = document.createElement('div');
    quoteElement.className = 'hidden-quote';
    quoteElement.innerHTML = `"${quote}" <br><small>- Vidal Sassoon</small>`;
    
    document.body.appendChild(quoteElement);
    
    // Show quote
    setTimeout(() => {
        quoteElement.classList.add('show');
    }, 100);
    
    // Hide and remove quote
    setTimeout(() => {
        quoteElement.classList.remove('show');
        setTimeout(() => {
            if (quoteElement.parentNode) {
                quoteElement.parentNode.removeChild(quoteElement);
            }
        }, 500);
    }, 5000);
    
    console.log('💫 Vidal Sassoon wisdom revealed!');
}

// Setup Konami Code easter egg
function setupKonamiCode() {
    document.addEventListener('keydown', (e) => {
        konamiSequence.push(e.keyCode);
        
        // Keep only the last 10 keypresses
        if (konamiSequence.length > 10) {
            konamiSequence.shift();
        }
        
        // Check if Konami code was entered
        if (konamiSequence.length === 10 && 
            konamiSequence.every((key, index) => key === konamiCode[index])) {
            
            activateKonamiEasterEgg();
            konamiSequence = []; // Reset
        }
    });
}

// Activate Konami Code easter egg
function activateKonamiEasterEgg() {
    document.body.classList.add('easter-egg-activated');
    
    // Create celebratory message
    const message = document.createElement('div');
    message.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 2rem;
        border-radius: 15px;
        text-align: center;
        z-index: 10000;
        animation: surprise-entrance 1s ease-out;
    `;
    message.innerHTML = `
        <h2>🎉 KONAMI CODE ACTIVATED! 🎉</h2>
        <p>You've unlocked the secret rainbow mode!</p>
        <p>"The cut that counts in living color!" - Vidal Sassoon</p>
        <button onclick="this.parentNode.remove()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #ff69b4; color: white; border: none; border-radius: 5px; cursor: pointer;">Awesome!</button>
    `;
    
    document.body.appendChild(message);
    
    // Add confetti celebration
    createConfettiExplosion();
    
    // Remove rainbow effect after 10 seconds
    setTimeout(() => {
        document.body.classList.remove('easter-egg-activated');
    }, 10000);
    
    console.log('🌈 KONAMI CODE EASTER EGG ACTIVATED! 🌈');
}

// Create confetti explosion
function createConfettiExplosion() {
    const celebration = document.createElement('div');
    celebration.className = 'success-celebration';
    document.body.appendChild(celebration);
    
    // Create 50 confetti pieces
    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.animationDelay = Math.random() * 0.5 + 's';
        confetti.style.animationDuration = (2 + Math.random()) + 's';
        celebration.appendChild(confetti);
    }
    
    // Remove celebration after animation
    setTimeout(() => {
        if (celebration.parentNode) {
            celebration.parentNode.removeChild(celebration);
        }
    }, 4000);
}

// Track returning visitors and show surprise
function trackVisitorReturn() {
    const lastVisit = localStorage.getItem('meghanHairLastVisit');
    const now = Date.now();
    
    if (lastVisit) {
        const daysSinceLastVisit = (now - parseInt(lastVisit)) / (1000 * 60 * 60 * 24);
        visitCount = parseInt(localStorage.getItem('meghanHairVisitCount') || '0') + 1;
        
        if (visitCount >= 3 && daysSinceLastVisit < 30) {
            setTimeout(() => {
                showReturningVisitorSurprise();
            }, 3000);
        }
    }
    
    localStorage.setItem('meghanHairLastVisit', now.toString());
    localStorage.setItem('meghanHairVisitCount', visitCount.toString());
}

// Show surprise for returning visitors
function showReturningVisitorSurprise() {
    const surprise = document.createElement('div');
    surprise.className = 'returning-visitor-surprise';
    surprise.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 1.5rem;">👋</span>
            <div>
                <strong>Welcome back!</strong><br>
                <small>Visit #${visitCount} - You're becoming a regular!</small>
            </div>
            <button onclick="this.parentNode.parentNode.remove()" style="background: rgba(255,255,255,0.2); border: none; color: white; padding: 5px; border-radius: 3px; cursor: pointer;">×</button>
        </div>
    `;
    
    document.body.appendChild(surprise);
    
    setTimeout(() => {
        if (surprise.parentNode) {
            surprise.parentNode.removeChild(surprise);
        }
    }, 8000);
    
    console.log(`🎉 Welcome back! Visit #${visitCount}`);
}

// Playful form validation with personality
function setupPlayfulFormValidation() {
    const form = document.getElementById('booking-form');
    if (!form) return;
    
    const encouragingMessages = {
        firstName: [
            "What a lovely name! ✨",
            "Beautiful choice! 💫",
            "Perfect! 🌟"
        ],
        email: [
            "Great email! We'll send you styling tips! 📧",
            "Perfect! Can't wait to connect! 💌",
            "Wonderful! You're almost booked! 🎉"
        ],
        service: [
            "Excellent choice! You'll love it! 💇‍♀️",
            "Perfect service selection! ✂️",
            "Great pick! Can't wait to work with you! 🌟"
        ]
    };
    
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        input.addEventListener('blur', () => {
            const container = input.closest('div');
            if (!container) return;
            
            // Remove previous validation classes
            container.classList.remove('form-field-error', 'form-field-success');
            
            if (input.value.trim()) {
                container.classList.add('form-field-success');
                
                // Show encouraging message occasionally
                if (Math.random() < 0.3 && encouragingMessages[input.name]) {
                    const messages = encouragingMessages[input.name];
                    const message = messages[Math.floor(Math.random() * messages.length)];
                    showTemporaryMessage(message, 'success');
                }
            } else if (input.hasAttribute('required')) {
                container.classList.add('form-field-error');
            }
        });
    });
}

// Show temporary encouraging message
function showTemporaryMessage(message, type = 'info') {
    const messageDiv = document.createElement('div');
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: ${type === 'success' ? '#10b981' : '#3b82f6'};
        color: white;
        padding: 0.75rem 1.5rem;
        border-radius: 25px;
        font-size: 0.875rem;
        z-index: 1000;
        animation: bounce-in 0.5s ease-out;
    `;
    messageDiv.textContent = message;
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.style.animation = 'bounce-out 0.5s ease-in forwards';
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 500);
    }, 2500);
}

// Add geometric overlays to service cards
function addGeometricOverlays() {
    const serviceCards = document.querySelectorAll('.service-card');
    serviceCards.forEach(card => {
        card.classList.add('has-geometric-overlay');
        const overlay = document.createElement('div');
        overlay.className = 'geometric-overlay';
        card.appendChild(overlay);
    });
}

// Setup happy cursor effects
function setupHappyCursor() {
    let lastCursorTrail = 0;
    
    document.addEventListener('mousemove', (e) => {
        const now = Date.now();
        if (now - lastCursorTrail < 100) return; // Throttle
        
        lastCursorTrail = now;
        
        // Only add trails on interactive elements
        const isInteractive = e.target.matches('button, .service-card, .portfolio-item img, a');
        if (!isInteractive) return;
        
        const trail = document.createElement('div');
        trail.style.cssText = `
            position: fixed;
            left: ${e.clientX - 5}px;
            top: ${e.clientY - 5}px;
            width: 10px;
            height: 10px;
            background: linear-gradient(45deg, #87ceeb, #ffc5c5);
            border-radius: 50%;
            pointer-events: none;
            z-index: 9999;
            animation: cursor-trail 0.8s ease-out forwards;
        `;
        
        document.body.appendChild(trail);
        
        setTimeout(() => {
            if (trail.parentNode) {
                trail.parentNode.removeChild(trail);
            }
        }, 800);
    });
    
    // Add CSS for cursor trail animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes cursor-trail {
            0% { opacity: 0.8; transform: scale(1); }
            100% { opacity: 0; transform: scale(0.3); }
        }
        
        @keyframes bounce-in {
            0% { opacity: 0; transform: translateX(-50%) scale(0.5); }
            100% { opacity: 1; transform: translateX(-50%) scale(1); }
        }
        
        @keyframes bounce-out {
            0% { opacity: 1; transform: translateX(-50%) scale(1); }
            100% { opacity: 0; transform: translateX(-50%) scale(0.5); }
        }
    `;
    document.head.appendChild(style);
}

// Initialize scroll reveal animations
function initializeScrollRevealAnimations() {
    const sections = document.querySelectorAll('section');
    sections.forEach(section => {
        section.classList.add('section-reveal');
    });
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                
                // Add a delightful delay for child elements
                const children = entry.target.querySelectorAll('.service-card, .portfolio-item, .testimonial-card');
                children.forEach((child, index) => {
                    setTimeout(() => {
                        child.style.animation = 'delightful-bounce 0.6s ease-out';
                    }, index * 100);
                });
            }
        });
    }, { threshold: 0.1 });
    
    sections.forEach(section => observer.observe(section));
}

// Setup star rating interactions
function setupStarRatingInteractions() {
    const starContainers = document.querySelectorAll('.flex.text-yellow-400');
    starContainers.forEach(container => {
        const stars = container.textContent.split('');
        container.innerHTML = '';
        container.classList.add('star-rating');
        
        stars.forEach((star, index) => {
            if (star === '★') {
                const starSpan = document.createElement('span');
                starSpan.className = 'star';
                starSpan.textContent = '★';
                starSpan.style.animationDelay = (index * 0.1) + 's';
                container.appendChild(starSpan);
            }
        });
    });
}

// Enhanced success message with celebration
function showSuccessMessageWithCelebration(message) {
    showSuccessMessage(message);
    createConfettiExplosion();
    
    // Add a delightful sound effect (if user allows)
    try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmccBT2a2+nKfCQELYDL9duROAgWYLPt4qNQEAhGqeXu_m0dBTuR2e7Jfi4GJXnH8N2MTAEV_r_1x3NVFAlMo-LvwGgdBj6W2+vFeCQELIHQ8t6NOwcTarr_75xLFg9Mo-3yvmsdBT2Y2PHL__8EFAIVYLD_2qNQEApHnOCLmYyfAABgAoAOAImDjTg6AjAAYAKADgCBs_fVDhQ8FnA_lLbHYLcA4g3gSz6AkZx-g9v-5EH3DRdAhTZM48T1LrKm_8jAv8-BuJEFKHdI9xAAAAAw');
        audio.volume = 0.1;
        audio.play().catch(() => {}); // Ignore if audio fails
    } catch (e) {}
    
    console.log('🎉 Success celebration activated!');
}

// Initialize all delightful features when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Add delay to let other initializations complete first
    setTimeout(initializeDelightfulFeatures, 500);
});

// Override the original success message function
if (typeof showSuccessMessage !== 'undefined') {
    const originalShowSuccessMessage = showSuccessMessage;
    showSuccessMessage = function(message) {
        showSuccessMessageWithCelebration(message);
    };
}

// ===== MOBILE PWA ENHANCEMENTS =====

// Setup touch gestures for portfolio
function setupTouchGestures() {
    const portfolioGrid = document.getElementById('portfolio-grid');
    if (!portfolioGrid) return;
    
    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let currentY = 0;
    let isDragging = false;
    
    portfolioGrid.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        isDragging = true;
    }, { passive: true });
    
    portfolioGrid.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        currentX = e.touches[0].clientX;
        currentY = e.touches[0].clientY;
    }, { passive: true });
    
    portfolioGrid.addEventListener('touchend', (e) => {
        if (!isDragging) return;
        isDragging = false;
        
        const diffX = startX - currentX;
        const diffY = startY - currentY;
        
        // Check if horizontal swipe is dominant
        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > swipeThreshold) {
            if (diffX > 0) {
                // Swipe left - next images
                showNextPortfolioSet();
            } else {
                // Swipe right - previous images
                showPrevPortfolioSet();
            }
        }
    }, { passive: true });
    
    console.log('📱 Touch gestures activated for portfolio');
}

// Portfolio swipe navigation
function showNextPortfolioSet() {
    const items = document.querySelectorAll('.portfolio-item:not(.hidden)');
    const itemsPerView = window.innerWidth < 768 ? 1 : window.innerWidth < 1024 ? 2 : 3;
    const maxIndex = Math.ceil(items.length / itemsPerView) - 1;
    
    portfolioSwipeIndex = Math.min(portfolioSwipeIndex + 1, maxIndex);
    updatePortfolioView(items, itemsPerView);
}

function showPrevPortfolioSet() {
    const items = document.querySelectorAll('.portfolio-item:not(.hidden)');
    const itemsPerView = window.innerWidth < 768 ? 1 : window.innerWidth < 1024 ? 2 : 3;
    
    portfolioSwipeIndex = Math.max(portfolioSwipeIndex - 1, 0);
    updatePortfolioView(items, itemsPerView);
}

function updatePortfolioView(items, itemsPerView) {
    items.forEach((item, index) => {
        const startIndex = portfolioSwipeIndex * itemsPerView;
        const endIndex = startIndex + itemsPerView;
        
        if (index >= startIndex && index < endIndex) {
            item.style.display = 'block';
            item.style.transform = 'translateX(0)';
        } else {
            item.style.display = 'none';
        }
    });
}

// Setup image lightbox with touch gestures
function setupImageLightbox() {
    const portfolioItems = document.querySelectorAll('.portfolio-item');
    const lightbox = document.getElementById('image-lightbox');
    const lightboxImage = document.getElementById('lightbox-image');
    const lightboxTitle = document.getElementById('lightbox-title');
    const lightboxDescription = document.getElementById('lightbox-description');
    const closeLightbox = document.getElementById('close-lightbox');
    const shareButton = document.getElementById('share-current-image');
    
    let currentImageIndex = 0;
    let allImages = [];
    
    portfolioItems.forEach((item, index) => {
        const img = item.querySelector('img');
        const title = item.querySelector('h3')?.textContent || 'Hair Style';
        const description = item.querySelector('p')?.textContent || 'Professional hair styling';
        
        allImages.push({ src: img.src, alt: img.alt, title, description });
        
        item.addEventListener('click', () => {
            currentImageIndex = index;
            showLightbox(allImages[index]);
        });
    });
    
    function showLightbox(imageData) {
        lightboxImage.src = imageData.src;
        lightboxImage.alt = imageData.alt;
        lightboxTitle.textContent = imageData.title;
        lightboxDescription.textContent = imageData.description;
        lightbox.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
    
    function hideLightbox() {
        lightbox.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }
    
    closeLightbox?.addEventListener('click', hideLightbox);
    lightbox?.addEventListener('click', (e) => {
        if (e.target === lightbox) hideLightbox();
    });
    
    // Touch gestures for lightbox navigation
    let lightboxStartX = 0;
    
    lightbox?.addEventListener('touchstart', (e) => {
        lightboxStartX = e.touches[0].clientX;
    }, { passive: true });
    
    lightbox?.addEventListener('touchend', (e) => {
        const touchEndX = e.changedTouches[0].clientX;
        const diff = lightboxStartX - touchEndX;
        
        if (Math.abs(diff) > swipeThreshold) {
            if (diff > 0 && currentImageIndex < allImages.length - 1) {
                // Swipe left - next image
                currentImageIndex++;
                showLightbox(allImages[currentImageIndex]);
            } else if (diff < 0 && currentImageIndex > 0) {
                // Swipe right - previous image
                currentImageIndex--;
                showLightbox(allImages[currentImageIndex]);
            }
        }
    }, { passive: true });
    
    // Share functionality
    shareButton?.addEventListener('click', () => {
        shareImage(allImages[currentImageIndex]);
    });
    
    console.log('🖼️ Image lightbox with touch gestures activated');
}

// Setup lazy loading for images
function setupLazyLoading() {
    const images = document.querySelectorAll('.lazy-load');
    
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.classList.add('loaded');
                    imageObserver.unobserve(img);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '50px'
        });
        
        images.forEach(img => imageObserver.observe(img));
        console.log('⚡ Lazy loading activated for', images.length, 'images');
    } else {
        // Fallback for older browsers
        images.forEach(img => img.classList.add('loaded'));
    }
}

// Setup offline handling
function setupOfflineHandling() {
    window.addEventListener('online', () => {
        isOnline = true;
        showConnectionStatus('back online', 'success');
        syncOfflineData();
    });
    
    window.addEventListener('offline', () => {
        isOnline = false;
        showConnectionStatus('offline - limited functionality', 'warning');
    });
    
    console.log('🌐 Offline handling activated');
}

function showConnectionStatus(message, type) {
    const statusDiv = document.createElement('div');
    statusDiv.className = `fixed top-20 left-4 right-4 p-3 rounded-lg text-white z-50 ${
        type === 'success' ? 'bg-green-500' : 'bg-orange-500'
    }`;
    statusDiv.textContent = `You are ${message}`;
    
    document.body.appendChild(statusDiv);
    
    setTimeout(() => {
        statusDiv.remove();
    }, 3000);
}

// Sync offline data
function syncOfflineData() {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
            type: 'SYNC_BOOKINGS'
        });
    }
}

// Setup sticky booking button
function setupStickyBookingButton() {
    const stickyBtn = document.getElementById('sticky-booking-btn');
    const bookingSection = document.getElementById('booking');
    
    if (!stickyBtn || !bookingSection) return;
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                stickyBtn.style.display = 'none';
            } else {
                stickyBtn.style.display = 'block';
            }
        });
    }, {
        threshold: 0.1
    });
    
    observer.observe(bookingSection);
    console.log('📌 Sticky booking button activated');
}

// Native sharing functionality
function setupNativeSharing() {
    const shareButtons = document.querySelectorAll('.share-image');
    
    shareButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const portfolioItem = button.closest('.portfolio-item');
            const img = portfolioItem.querySelector('img');
            const title = portfolioItem.querySelector('h3')?.textContent || 'Hair Style';
            
            shareImage({ src: img.src, title, alt: img.alt });
        });
    });
    
    console.log('📤 Native sharing activated for', shareButtons.length, 'images');
}

// Share image function
async function shareImage(imageData) {
    if (navigator.share) {
        try {
            await navigator.share({
                title: `${imageData.title} - Meghan Hair Studio`,
                text: 'Check out this amazing hair style by Meghan!',
                url: window.location.href
            });
            console.log('📱 Native share successful');
        } catch (error) {
            console.log('Share cancelled or failed:', error);
            fallbackShare(imageData);
        }
    } else {
        fallbackShare(imageData);
    }
}

// Fallback sharing
function fallbackShare(imageData) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(window.location.href)
            .then(() => {
                showSuccessMessage('Link copied to clipboard!');
            })
            .catch(() => {
                showShareModal(imageData);
            });
    } else {
        showShareModal(imageData);
    }
}

// Show share modal
function showShareModal(imageData) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
    modal.innerHTML = `
        <div class="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h3 class="text-xl font-bold mb-4">Share this style</h3>
            <div class="grid grid-cols-2 gap-3">
                <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}" 
                   target="_blank" class="bg-blue-600 text-white p-3 rounded-lg text-center hover:bg-blue-700 transition-colors touch-manipulation">
                    Facebook
                </a>
                <a href="https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent('Check out this amazing hair style!')}"
                   target="_blank" class="bg-sky-500 text-white p-3 rounded-lg text-center hover:bg-sky-600 transition-colors touch-manipulation">
                    Twitter
                </a>
                <a href="mailto:?subject=Amazing Hair Style&body=Check out this hair style: ${window.location.href}"
                   class="bg-gray-600 text-white p-3 rounded-lg text-center hover:bg-gray-700 transition-colors touch-manipulation">
                    Email
                </a>
                <button class="bg-green-600 text-white p-3 rounded-lg hover:bg-green-700 transition-colors touch-manipulation" onclick="copyToClipboard()">
                    Copy Link
                </button>
            </div>
            <button class="w-full mt-4 bg-gray-300 text-gray-700 p-3 rounded-lg hover:bg-gray-400 transition-colors touch-manipulation" onclick="this.parentElement.parentElement.remove()">
                Close
            </button>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close on outside click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Copy to clipboard helper
function copyToClipboard() {
    navigator.clipboard.writeText(window.location.href)
        .then(() => {
            showSuccessMessage('Link copied to clipboard!');
        })
        .catch(() => {
            showErrorMessage('Failed to copy link');
        });
}

// Enhanced form handling for mobile
function enhanceMobileFormExperience() {
    const form = document.getElementById('booking-form');
    if (!form) return;
    
    // Auto-capitalize names
    const nameInputs = form.querySelectorAll('input[name="firstName"], input[name="lastName"]');
    nameInputs.forEach(input => {
        input.addEventListener('input', (e) => {
            const value = e.target.value;
            e.target.value = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
        });
    });
    
    // Format phone number
    const phoneInput = form.querySelector('input[name="phone"]');
    if (phoneInput) {
        phoneInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length >= 6) {
                value = `(${value.slice(0, 3)}) ${value.slice(3, 6)}-${value.slice(6, 10)}`;
            } else if (value.length >= 3) {
                value = `(${value.slice(0, 3)}) ${value.slice(3)}`;
            }
            e.target.value = value;
        });
    }
    
    console.log('📱 Mobile form experience enhanced');
}

// Enhanced mobile menu with better touch handling
function enhancedToggleMobileMenu() {
    const hamburger = document.querySelector('.hamburger-menu');
    const overlay = document.getElementById('mobile-nav-overlay');
    
    let mobileMenu = document.querySelector('.mobile-menu');
    if (!mobileMenu) {
        mobileMenu = createMobileMenu();
        document.body.appendChild(mobileMenu);
    }
    
    const isActive = mobileMenu.classList.contains('active');
    
    if (isActive) {
        // Close menu
        mobileMenu.classList.remove('active');
        hamburger.classList.remove('active');
        overlay.classList.add('hidden');
        document.body.style.overflow = 'auto';
    } else {
        // Open menu
        mobileMenu.classList.add('active');
        hamburger.classList.add('active');
        overlay.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
    
    // Close on overlay click
    overlay.addEventListener('click', () => {
        enhancedToggleMobileMenu();
    });
}

// Override the original mobile menu function
function toggleMobileMenu() {
    enhancedToggleMobileMenu();
}

// Push notification setup
function setupPushNotifications() {
    if ('Notification' in window && 'serviceWorker' in navigator) {
        // Request permission on user interaction
        document.addEventListener('click', requestNotificationPermission, { once: true });
    }
}

function requestNotificationPermission() {
    if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                console.log('🔔 Notification permission granted');
                subscribeToNotifications();
            }
        });
    }
}

function subscribeToNotifications() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(registration => {
            return registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: 'YOUR_VAPID_PUBLIC_KEY' // Replace with actual key
            });
        }).then(subscription => {
            console.log('📱 Push subscription:', subscription);
            // Send subscription to server
        }).catch(error => {
            console.error('Failed to subscribe to push notifications:', error);
        });
    }
}

// Initialize mobile enhancements
enhanceMobileFormExperience();
setupPushNotifications();

console.log('📱 Mobile PWA enhancements loaded successfully!');

// Export functions for testing (if running in Node.js environment)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        validateBookingForm,
        isValidEmail,
        generateBookingId,
        createBookingOnServer,
        processPaymentOnServer,
        // Delightful functions
        showVidalQuote,
        createConfettiExplosion,
        activateKonamiEasterEgg,
        // Mobile PWA functions
        shareImage,
        setupTouchGestures,
        setupImageLightbox,
        setupLazyLoading,
        setupOfflineHandling,
        setupStickyBookingButton,
        setupNativeSharing
    };
}