const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  // Customer Information
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },

  // Service Information
  service: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: true
  },

  // Appointment Details
  date: {
    type: Date,
    required: true
  },
  time: {
    type: String,
    required: true,
    match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
  },
  duration: {
    type: Number, // in minutes
    default: 60
  },

  // Additional Information
  notes: {
    type: String,
    trim: true,
    maxlength: 500
  },
  specialRequests: {
    type: String,
    trim: true,
    maxlength: 500
  },

  // Pricing
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  discount: {
    type: Number,
    default: 0,
    min: 0
  },
  finalAmount: {
    type: Number,
    get: function() {
      return this.totalAmount - this.discount;
    }
  },

  // Status Tracking
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded', 'partially-refunded'],
    default: 'pending'
  },

  // Payment Reference
  payment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment'
  },

  // Cancellation Information
  cancellationReason: String,
  cancelledAt: Date,
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Stylist Assignment (for future expansion)
  stylist: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Reminder Tracking
  remindersSent: [{
    type: {
      type: String,
      enum: ['24h', '2h', 'confirmation']
    },
    sentAt: {
      type: Date,
      default: Date.now
    },
    method: {
      type: String,
      enum: ['email', 'sms'],
      default: 'email'
    }
  }],

  // Review and Rating (post-appointment)
  review: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: {
      type: String,
      maxlength: 1000
    },
    submittedAt: Date
  },

  // Source tracking
  source: {
    type: String,
    enum: ['website', 'phone', 'walk-in', 'referral', 'social'],
    default: 'website'
  },

  // Internal Notes (admin/stylist only)
  internalNotes: {
    type: String,
    trim: true,
    maxlength: 1000
  },

  // Customer History Reference
  isFirstTime: {
    type: Boolean,
    default: true
  },
  previousBookings: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking'
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true, getters: true },
  toObject: { virtuals: true, getters: true }
});

// Indexes for performance
bookingSchema.index({ date: 1, time: 1 });
bookingSchema.index({ email: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ paymentStatus: 1 });
bookingSchema.index({ createdAt: -1 });

// Virtual for full customer name
bookingSchema.virtual('customerName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for booking date/time
bookingSchema.virtual('appointmentDateTime').get(function() {
  if (this.date && this.time) {
    const dateStr = this.date.toISOString().split('T')[0];
    return new Date(`${dateStr}T${this.time}`);
  }
  return null;
});

// Virtual for time until appointment
bookingSchema.virtual('timeUntilAppointment').get(function() {
  const appointmentDateTime = this.appointmentDateTime;
  if (appointmentDateTime) {
    const now = new Date();
    const diffMs = appointmentDateTime - now;
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    return diffHours;
  }
  return null;
});

// Pre-save middleware
bookingSchema.pre('save', async function(next) {
  // Set duration from service if not already set
  if (this.isNew && !this.duration && this.service) {
    await this.populate('service');
    this.duration = this.service.duration || 60;
  }

  // Check if this is a first-time customer
  if (this.isNew) {
    const existingBookings = await this.constructor.find({
      email: this.email,
      _id: { $ne: this._id }
    });
    this.isFirstTime = existingBookings.length === 0;
  }

  next();
});

// Static methods
bookingSchema.statics.findUpcoming = function(days = 7) {
  const now = new Date();
  const future = new Date();
  future.setDate(future.getDate() + days);
  
  return this.find({
    date: { $gte: now, $lte: future },
    status: { $in: ['pending', 'confirmed'] }
  }).populate('service').sort({ date: 1, time: 1 });
};

bookingSchema.statics.findByDateRange = function(startDate, endDate) {
  return this.find({
    date: { $gte: startDate, $lte: endDate }
  }).populate('service').sort({ date: 1, time: 1 });
};

bookingSchema.statics.getBookingStats = async function(startDate, endDate) {
  const stats = await this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        totalBookings: { $sum: 1 },
        totalRevenue: { $sum: '$totalAmount' },
        confirmedBookings: {
          $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] }
        },
        completedBookings: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        cancelledBookings: {
          $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
        }
      }
    }
  ]);

  return stats[0] || {
    totalBookings: 0,
    totalRevenue: 0,
    confirmedBookings: 0,
    completedBookings: 0,
    cancelledBookings: 0
  };
};

// Instance methods
bookingSchema.methods.canBeCancelled = function() {
  if (this.status === 'cancelled' || this.status === 'completed') {
    return false;
  }

  const appointmentDateTime = this.appointmentDateTime;
  if (!appointmentDateTime) return false;

  const now = new Date();
  const hoursUntilAppointment = (appointmentDateTime - now) / (1000 * 60 * 60);
  
  return hoursUntilAppointment >= 24; // 24-hour cancellation policy
};

bookingSchema.methods.needsReminder = function(type) {
  const appointmentDateTime = this.appointmentDateTime;
  if (!appointmentDateTime || this.status !== 'confirmed') return false;

  const now = new Date();
  const hoursUntilAppointment = (appointmentDateTime - now) / (1000 * 60 * 60);

  // Check if reminder was already sent
  const reminderSent = this.remindersSent.some(reminder => reminder.type === type);
  if (reminderSent) return false;

  if (type === '24h' && hoursUntilAppointment <= 24 && hoursUntilAppointment > 23) {
    return true;
  }
  if (type === '2h' && hoursUntilAppointment <= 2 && hoursUntilAppointment > 1.5) {
    return true;
  }

  return false;
};

bookingSchema.methods.markReminderSent = function(type, method = 'email') {
  this.remindersSent.push({
    type,
    method,
    sentAt: new Date()
  });
  return this.save();
};

module.exports = mongoose.model('Booking', bookingSchema);