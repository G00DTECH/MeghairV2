const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: ['cuts', 'color', 'styling', 'treatments', 'packages', 'consultations'],
    default: 'cuts'
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  duration: {
    type: Number, // in minutes
    required: true,
    min: 15,
    max: 480 // 8 hours max
  },
  isActive: {
    type: Boolean,
    default: true
  },
  bookingsCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Add default services
serviceSchema.statics.getDefaultServices = function() {
  return [
    {
      name: 'Precision Cut',
      description: 'Expert cutting techniques that enhance your natural features and lifestyle.',
      category: 'cuts',
      price: 85,
      duration: 60,
      isActive: true
    },
    {
      name: 'Color Services',
      description: 'Full color, highlights, lowlights, and color correction services.',
      category: 'color',
      price: 120,
      duration: 120,
      isActive: true
    },
    {
      name: 'Cut & Color Package',
      description: 'Complete transformation with precision cut and color services.',
      category: 'packages',
      price: 185,
      duration: 180,
      isActive: true
    },
    {
      name: 'Special Event Styling',
      description: 'Professional styling for weddings, events, and special occasions.',
      category: 'styling',
      price: 95,
      duration: 90,
      isActive: true
    },
    {
      name: 'Style Consultation',
      description: 'In-depth consultation to design your perfect look and style plan.',
      category: 'consultations',
      price: 35,
      duration: 30,
      isActive: true
    },
    {
      name: 'Maintenance Touch-Up',
      description: 'Regular maintenance cuts and quick color touch-ups between appointments.',
      category: 'cuts',
      price: 55,
      duration: 45,
      isActive: true
    }
  ];
};

module.exports = mongoose.model('Service', serviceSchema);