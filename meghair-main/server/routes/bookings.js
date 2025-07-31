const express = require('express');
const { body, validationResult } = require('express-validator');
const Booking = require('../models/Booking');
const Service = require('../models/Service');
const emailService = require('../services/emailService');
const auth = require('../middleware/auth');

const router = express.Router();

// Validation middleware
const createBookingValidation = [
  body('firstName').trim().isLength({ min: 2 }).withMessage('First name is required'),
  body('lastName').trim().isLength({ min: 2 }).withMessage('Last name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('phone').isMobilePhone().withMessage('Valid phone number is required'),
  body('serviceId').isMongoId().withMessage('Valid service ID is required'),
  body('date').isISO8601().withMessage('Valid date is required'),
  body('time').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid time is required'),
];

// Create booking
router.post('/', createBookingValidation, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const {
      firstName,
      lastName,
      email,
      phone,
      serviceId,
      date,
      time,
      notes = ''
    } = req.body;

    // Verify service exists
    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    // Check if the requested date/time is available
    const bookingDateTime = new Date(`${date}T${time}`);
    const now = new Date();

    // Validate booking is in the future
    if (bookingDateTime <= now) {
      return res.status(400).json({
        success: false,
        message: 'Booking must be in the future'
      });
    }

    // Check business hours (Tuesday-Saturday, 9 AM - 6 PM)
    const dayOfWeek = bookingDateTime.getDay();
    const hour = bookingDateTime.getHours();
    
    if (dayOfWeek === 0 || dayOfWeek === 1) { // Sunday or Monday
      return res.status(400).json({
        success: false,
        message: 'Bookings are only available Tuesday through Saturday'
      });
    }

    if (hour < 9 || hour >= 18) {
      return res.status(400).json({
        success: false,
        message: 'Bookings are only available between 9 AM and 6 PM'
      });
    }

    // Check for conflicting bookings (allow 15-minute buffer)
    const bufferTime = 15 * 60 * 1000; // 15 minutes in milliseconds
    const startTime = new Date(bookingDateTime.getTime() - bufferTime);
    const endTime = new Date(bookingDateTime.getTime() + service.duration * 60 * 1000 + bufferTime);

    const conflictingBooking = await Booking.findOne({
      date: {
        $gte: new Date(date + 'T00:00:00'),
        $lt: new Date(date + 'T23:59:59')
      },
      time: {
        $gte: startTime.toTimeString().slice(0, 5),
        $lt: endTime.toTimeString().slice(0, 5)
      },
      status: { $in: ['pending', 'confirmed'] }
    });

    if (conflictingBooking) {
      return res.status(409).json({
        success: false,
        message: 'This time slot is not available. Please choose another time.'
      });
    }

    // Calculate total amount (service price + any add-ons)
    const totalAmount = service.price;

    // Create booking
    const booking = new Booking({
      firstName,
      lastName,
      email,
      phone,
      service: serviceId,
      date: new Date(date),
      time,
      notes,
      totalAmount,
      status: 'pending',
      paymentStatus: 'pending'
    });

    await booking.save();
    await booking.populate('service');

    // Send confirmation email to customer
    try {
      await emailService.sendBookingCreated(booking);
    } catch (emailError) {
      console.error('Failed to send booking confirmation email:', emailError);
      // Don't fail the booking creation if email fails
    }

    // Send notification to admin
    try {
      await emailService.sendAdminBookingNotification(booking);
    } catch (emailError) {
      console.error('Failed to send admin notification:', emailError);
    }

    res.status(201).json({
      success: true,
      booking: {
        id: booking._id,
        firstName: booking.firstName,
        lastName: booking.lastName,
        email: booking.email,
        phone: booking.phone,
        service: booking.service,
        date: booking.date,
        time: booking.time,
        notes: booking.notes,
        totalAmount: booking.totalAmount,
        status: booking.status,
        paymentStatus: booking.paymentStatus
      }
    });

  } catch (error) {
    console.error('Booking creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create booking',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get available time slots for a date
router.get('/availability/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const { serviceId } = req.query;

    // Validate date
    const requestedDate = new Date(date);
    if (isNaN(requestedDate)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format'
      });
    }

    // Check if date is in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (requestedDate < today) {
      return res.status(400).json({
        success: false,
        message: 'Cannot check availability for past dates'
      });
    }

    // Check if it's a business day
    const dayOfWeek = requestedDate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 1) { // Sunday or Monday
      return res.json({
        success: true,
        availableSlots: [],
        message: 'Closed on Sundays and Mondays'
      });
    }

    // Get service duration if specified
    let serviceDuration = 60; // Default 1 hour
    if (serviceId) {
      const service = await Service.findById(serviceId);
      if (service) {
        serviceDuration = service.duration;
      }
    }

    // Generate all possible time slots (9 AM to 6 PM, 30-minute intervals)
    const timeSlots = [];
    for (let hour = 9; hour < 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        
        // Check if there's enough time before closing (6 PM)
        const slotEnd = hour + (minute + serviceDuration) / 60;
        if (slotEnd <= 18) {
          timeSlots.push(timeString);
        }
      }
    }

    // Get existing bookings for this date
    const existingBookings = await Booking.find({
      date: {
        $gte: new Date(date + 'T00:00:00'),
        $lt: new Date(date + 'T23:59:59')
      },
      status: { $in: ['pending', 'confirmed'] }
    }).populate('service');

    // Filter out unavailable slots
    const availableSlots = timeSlots.filter(slot => {
      const slotTime = new Date(`${date}T${slot}`);
      
      return !existingBookings.some(booking => {
        const bookingTime = new Date(`${date}T${booking.time}`);
        const bookingEnd = new Date(bookingTime.getTime() + booking.service.duration * 60 * 1000);
        const slotEnd = new Date(slotTime.getTime() + serviceDuration * 60 * 1000);
        
        // Check for overlap (with 15-minute buffer)
        const buffer = 15 * 60 * 1000; // 15 minutes
        return (slotTime >= new Date(bookingTime.getTime() - buffer) && 
                slotTime < new Date(bookingEnd.getTime() + buffer)) ||
               (slotEnd > new Date(bookingTime.getTime() - buffer) && 
                slotEnd <= new Date(bookingEnd.getTime() + buffer));
      });
    });

    res.json({
      success: true,
      date,
      availableSlots,
      businessHours: '9:00 AM - 6:00 PM',
      businessDays: 'Tuesday - Saturday'
    });

  } catch (error) {
    console.error('Availability check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check availability'
    });
  }
});

// Get booking by ID
router.get('/:id', async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('service')
      .populate('payment');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    res.json({
      success: true,
      booking
    });

  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get booking'
    });
  }
});

// Update booking status (admin/stylist only)
router.patch('/:id/status', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'stylist') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const { status } = req.body;
    const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled', 'no-show'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const booking = await Booking.findById(req.params.id).populate('service');
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    booking.status = status;
    booking.updatedAt = new Date();
    await booking.save();

    // Send status update email
    try {
      await emailService.sendBookingStatusUpdate(booking, status);
    } catch (emailError) {
      console.error('Failed to send status update email:', emailError);
    }

    res.json({
      success: true,
      booking: {
        id: booking._id,
        status: booking.status,
        updatedAt: booking.updatedAt
      }
    });

  } catch (error) {
    console.error('Update booking status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update booking status'
    });
  }
});

// Cancel booking
router.post('/:id/cancel', async (req, res) => {
  try {
    const { reason = 'Customer cancellation' } = req.body;
    
    const booking = await Booking.findById(req.params.id).populate('service payment');
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Booking is already cancelled'
      });
    }

    // Check if cancellation is within policy (e.g., 24 hours before)
    const bookingDateTime = new Date(`${booking.date.toISOString().split('T')[0]}T${booking.time}`);
    const now = new Date();
    const hoursUntilBooking = (bookingDateTime - now) / (1000 * 60 * 60);

    if (hoursUntilBooking < 24) {
      return res.status(400).json({
        success: false,
        message: 'Cancellations must be made at least 24 hours in advance'
      });
    }

    booking.status = 'cancelled';
    booking.cancellationReason = reason;
    booking.cancelledAt = new Date();
    await booking.save();

    // Process refund if payment was made
    if (booking.payment && booking.paymentStatus === 'paid') {
      // Refund logic would go here
      // This would integrate with the payment refund endpoint
    }

    // Send cancellation confirmation
    try {
      await emailService.sendCancellationConfirmation(booking, reason);
    } catch (emailError) {
      console.error('Failed to send cancellation email:', emailError);
    }

    res.json({
      success: true,
      message: 'Booking cancelled successfully',
      booking: {
        id: booking._id,
        status: booking.status,
        cancelledAt: booking.cancelledAt
      }
    });

  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel booking'
    });
  }
});

// Get bookings (admin/stylist only)
router.get('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'stylist') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const { 
      page = 1, 
      limit = 20, 
      status, 
      startDate, 
      endDate,
      search 
    } = req.query;

    const query = {};
    
    if (status) query.status = status;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const bookings = await Booking.find(query)
      .populate('service', 'name price duration')
      .sort({ date: -1, time: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Booking.countDocuments(query);

    res.json({
      success: true,
      bookings,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get bookings'
    });
  }
});

module.exports = router;