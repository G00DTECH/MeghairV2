# Meghan Hair Studio - Enhanced Website with Payment Integration

A modern, professional hair salon website with integrated booking and payment system, featuring Vidal Sassoon-inspired precision styling philosophy.

## 🚀 Features

### Frontend
- **Modern Design**: Elegant, mobile-first responsive design
- **Progressive Web App (PWA)**: Installable app experience with offline functionality
- **Service Showcase**: Professional portfolio gallery with category filtering
- **Online Booking**: Integrated appointment booking system
- **Stripe Payments**: Secure payment processing for services
- **Real-time Availability**: Check available time slots
- **Mobile Optimized**: Touch-friendly interface with swipe gestures
- **Accessibility**: WCAG compliant with keyboard navigation
- **Whimsical Elements**: Delightful micro-interactions and easter eggs

### Backend
- **Node.js/Express**: RESTful API server
- **MongoDB**: Database for bookings, services, and payments
- **Stripe Integration**: Complete payment processing with webhooks
- **Email Notifications**: Automated booking confirmations and reminders
- **Admin Dashboard**: Booking management and analytics
- **Security**: Rate limiting, authentication, input validation
- **Scalable Architecture**: Ready for AI chatbot integration

## 📁 Project Structure

```
meghair-main/
├── enhanced-index.html          # Main website file
├── enhanced-styles.css          # Enhanced styling
├── enhanced-scripts.js          # Frontend JavaScript
├── netlify.toml                # Netlify deployment config
├── manifest.json               # PWA manifest
├── sw.js                       # Service worker
├── folder/                     # Image assets
│   ├── bio_meg.png
│   ├── meg3.jpg - meg9.jpg
└── server/                     # Backend application
    ├── server.js               # Main server file
    ├── package.json            # Dependencies
    ├── .env.example            # Environment variables template
    ├── models/                 # Database models
    ├── routes/                 # API routes
    ├── middleware/             # Express middleware
    └── services/               # Business logic
```

## 🛠️ Setup Instructions

### Frontend Deployment (Netlify)

1. **Deploy to Netlify**:
   ```bash
   # Push code to GitHub
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/meghan-hair-studio.git
   git push -u origin main
   
   # Connect to Netlify and deploy
   ```

2. **Configure Domain**:
   - Set up custom domain in Netlify
   - Update CORS settings in backend

3. **Environment Variables**:
   - Set `STRIPE_PUBLISHABLE_KEY` in Netlify

### Backend Deployment (Railway/Render)

1. **Install Dependencies**:
   ```bash
   cd server
   npm install
   ```

2. **Environment Setup**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Database Setup**:
   ```bash
   # Create MongoDB Atlas cluster or use local MongoDB
   # Update MONGODB_URI in .env
   ```

4. **Stripe Configuration**:
   - Create Stripe account
   - Get API keys from dashboard
   - Set up webhook endpoint
   - Update environment variables

5. **Email Configuration**:
   - Set up SendGrid account OR configure SMTP
   - Update email settings in .env

6. **Deploy to Railway**:
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli
   
   # Login and deploy
   railway login
   railway init
   railway up
   ```

## 🔧 Configuration

### Required Environment Variables

**Backend (.env)**:
```
NODE_ENV=production
MONGODB_URI=your_mongodb_connection_string
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
SENDGRID_API_KEY=your_sendgrid_api_key
FROM_EMAIL=noreply@meghanhair.com
FRONTEND_URL=https://meghanhair.com
JWT_SECRET=your_jwt_secret
```

**Frontend (JavaScript)**:
```javascript
// Update in enhanced-scripts.js
const stripe = Stripe('pk_live_your_publishable_key');
```

### Stripe Setup

1. **Create Stripe Account**: https://dashboard.stripe.com
2. **Get API Keys**: Dashboard → Developers → API keys
3. **Set up Webhook**: 
   - Endpoint: `https://your-backend.com/api/webhooks/stripe`
   - Events: `payment_intent.succeeded`, `payment_intent.payment_failed`
4. **Test Cards**: Use Stripe test cards for development

### Email Templates

The system includes automated emails for:
- Booking confirmations
- Payment receipts
- Appointment reminders (24h, 2h before)
- Cancellation confirmations
- Admin notifications

## 📱 Progressive Web App (PWA)

The website can be installed as a mobile app:

1. **Installation**: Users see install prompts on supported devices
2. **Offline Mode**: Basic functionality works without internet
3. **Push Notifications**: Ready for appointment reminders (requires setup)
4. **App-like Experience**: Runs in standalone mode

## 🎨 Design Features

### Whimsical Elements
- Floating particles in hero section
- Easter eggs (Konami code, scroll quotes)
- Hover animations and micro-interactions
- Confetti celebrations on booking success
- Playful form validation messages

### Accessibility
- WCAG 2.1 AA compliant
- Keyboard navigation support
- Screen reader friendly
- Reduced motion preferences respected
- High contrast mode support

## 🤖 Future AI Integration

The architecture is prepared for AI chatbot integration:

- **API Endpoints**: Ready for chat interactions
- **Database Schema**: Supports conversation history
- **Frontend Placeholder**: AI chat area already designed
- **Vidal Sassoon Knowledge Base**: Ready for training data

### Planned AI Features
- Style recommendations based on face shape and lifestyle
- Virtual consultations with Vidal Sassoon techniques
- Automatic appointment booking through chat
- Price estimates based on conversation
- Hair care advice and education

## 📊 Analytics & Monitoring

### Recommended Integrations
- **Google Analytics 4**: User behavior tracking
- **Sentry**: Error monitoring
- **Stripe Dashboard**: Payment analytics
- **MongoDB Atlas**: Database monitoring
- **Netlify Analytics**: Site performance

## 🔒 Security Features

- **HTTPS Enforced**: SSL certificates
- **Payment Security**: PCI DSS compliant via Stripe
- **Data Protection**: Input validation and sanitization
- **Rate Limiting**: Prevents abuse
- **CORS Protection**: Restricts API access
- **JWT Authentication**: Secure admin access

## 💰 Cost Estimates (Monthly)

**Development/Small Scale**:
- MongoDB Atlas: $0 (512MB free tier)
- Railway/Render: $5-10
- Netlify: $0 (free tier)
- Stripe: 2.9% + 30¢ per transaction
- SendGrid: $0 (100 emails/day free)
- **Total**: ~$5-10/month + transaction fees

**Production/Growing Business**:
- MongoDB Atlas: $9 (M2 cluster)
- Railway Pro: $20
- Netlify Pro: $19
- Domain: $15/year
- Stripe: Same transaction fees
- SendGrid Essentials: $15
- **Total**: ~$65/month + transaction fees

## 🚀 Deployment Checklist

### Pre-Launch
- [ ] Test all payment flows
- [ ] Verify mobile responsiveness
- [ ] Check accessibility compliance
- [ ] Test PWA installation
- [ ] Validate all forms and booking flows
- [ ] Set up analytics tracking
- [ ] Configure email templates
- [ ] Test appointment reminders

### Go-Live
- [ ] Update Stripe to live keys
- [ ] Configure production environment variables
- [ ] Set up monitoring and alerts
- [ ] Create admin accounts
- [ ] Seed database with services
- [ ] Test end-to-end booking flow
- [ ] Set up backup procedures

### Post-Launch
- [ ] Monitor error rates
- [ ] Track conversion metrics
- [ ] Collect user feedback
- [ ] Plan feature updates
- [ ] Prepare AI integration

## 📞 Support

For technical support or customization requests:
- Review documentation in `/docs` folder
- Check troubleshooting guide
- Contact developer for advanced features

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Built with ❤️ for Meghan Hair Studio** - *Precision hair artistry inspired by Vidal Sassoon's legacy of excellence*