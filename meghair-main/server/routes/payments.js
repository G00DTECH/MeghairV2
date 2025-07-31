const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const emailService = require('../services/emailService');
const auth = require('../middleware/auth');

const router = express.Router();

// Rate limiting for payment endpoints
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 payment attempts per windowMs
  message: 'Too many payment attempts, please try again later.',
});

// Validation middleware
const createPaymentValidation = [
  body('amount').isNumeric().withMessage('Amount must be a number'),
  body('currency').isLength({ min: 3, max: 3 }).withMessage('Currency must be 3 characters'),
  body('bookingId').isMongoId().withMessage('Valid booking ID required'),
  body('customerEmail').isEmail().withMessage('Valid email required'),
];

// Create payment intent
router.post('/create-payment-intent', paymentLimiter, createPaymentValidation, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { amount, currency = 'usd', bookingId, customerEmail, customerName } = req.body;

    // Verify booking exists and is not already paid
    const booking = await Booking.findById(bookingId).populate('service');
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    if (booking.paymentStatus === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Booking is already paid'
      });
    }

    // Verify amount matches booking
    const expectedAmount = Math.round(booking.totalAmount * 100); // Convert to cents
    if (amount !== expectedAmount) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount does not match booking total'
      });
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: expectedAmount,
      currency: currency.toLowerCase(),
      customer_email: customerEmail,
      metadata: {
        bookingId: bookingId,
        customerName: customerName || '',
        serviceName: booking.service.name,
      },
      automatic_payment_methods: {
        enabled: true,
      },
      receipt_email: customerEmail,
    });

    // Create payment record
    const payment = new Payment({
      stripePaymentIntentId: paymentIntent.id,
      booking: bookingId,
      amount: amount / 100, // Store in dollars
      currency: currency,
      status: 'pending',
      customerEmail: customerEmail,
      customerName: customerName,
    });

    await payment.save();

    // Update booking with payment info
    booking.payment = payment._id;
    booking.paymentStatus = 'pending';
    await booking.save();

    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });

  } catch (error) {
    console.error('Payment intent creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment intent',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Confirm payment
router.post('/confirm-payment', async (req, res) => {
  try {
    const { paymentIntentId } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({
        success: false,
        message: 'Payment intent ID required'
      });
    }

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    // Find payment record
    const payment = await Payment.findOne({ stripePaymentIntentId: paymentIntentId })
      .populate('booking');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found'
      });
    }

    // Update payment status
    payment.status = paymentIntent.status;
    if (paymentIntent.status === 'succeeded') {
      payment.paidAt = new Date();
      payment.stripeChargeId = paymentIntent.latest_charge;
    }
    await payment.save();

    // Update booking status
    const booking = payment.booking;
    if (paymentIntent.status === 'succeeded') {
      booking.paymentStatus = 'paid';
      booking.status = 'confirmed';
      await booking.save();

      // Send confirmation email
      try {
        await emailService.sendBookingConfirmation(booking, payment);
      } catch (emailError) {
        console.error('Failed to send confirmation email:', emailError);
        // Don't fail the payment confirmation if email fails
      }
    }

    res.json({
      success: true,
      payment: {
        id: payment._id,
        status: payment.status,
        amount: payment.amount,
      },
      booking: {
        id: booking._id,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
      }
    });

  } catch (error) {
    console.error('Payment confirmation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to confirm payment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get payment details
router.get('/payment/:paymentId', auth, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.paymentId)
      .populate('booking');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Check if user has permission to view this payment
    if (req.user.role !== 'admin' && 
        req.user.role !== 'stylist' && 
        payment.customerEmail !== req.user.email) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      payment: {
        id: payment._id,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        paidAt: payment.paidAt,
        customerName: payment.customerName,
        customerEmail: payment.customerEmail,
        booking: payment.booking
      }
    });

  } catch (error) {
    console.error('Get payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payment details'
    });
  }
});

// Process refund (admin only)
router.post('/refund', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'stylist') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const { paymentId, amount, reason } = req.body;

    const payment = await Payment.findById(paymentId).populate('booking');
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    if (payment.status !== 'succeeded') {
      return res.status(400).json({
        success: false,
        message: 'Cannot refund unsuccessful payment'
      });
    }

    // Process refund with Stripe
    const refund = await stripe.refunds.create({
      payment_intent: payment.stripePaymentIntentId,
      amount: amount ? Math.round(amount * 100) : undefined, // Partial or full refund
      reason: reason || 'requested_by_customer',
      metadata: {
        bookingId: payment.booking._id.toString(),
        refundedBy: req.user.email,
      }
    });

    // Update payment record
    payment.refunds.push({
      stripeRefundId: refund.id,
      amount: refund.amount / 100,
      reason: reason,
      refundedAt: new Date(),
      refundedBy: req.user._id
    });

    // Update status if fully refunded
    if (refund.amount === payment.amount * 100) {
      payment.status = 'refunded';
    }

    await payment.save();

    // Update booking status
    const booking = payment.booking;
    booking.status = 'cancelled';
    booking.paymentStatus = payment.status;
    await booking.save();

    // Send refund notification email
    try {
      await emailService.sendRefundNotification(booking, payment, refund.amount / 100);
    } catch (emailError) {
      console.error('Failed to send refund email:', emailError);
    }

    res.json({
      success: true,
      refund: {
        id: refund.id,
        amount: refund.amount / 100,
        status: refund.status
      }
    });

  } catch (error) {
    console.error('Refund error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process refund',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get payment history (admin/stylist only)
router.get('/history', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'stylist') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const { page = 1, limit = 20, status, startDate, endDate } = req.query;

    const query = {};
    if (status) query.status = status;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const payments = await Payment.find(query)
      .populate('booking', 'date time service customerName')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Payment.countDocuments(query);

    res.json({
      success: true,
      payments,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Payment history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payment history'
    });
  }
});

module.exports = router;