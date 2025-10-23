const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    unique: true,
    index: true,
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  description: {
    type: String,
    trim: true,
  },
  cuisine: [{
    type: String,
    trim: true,
  }],
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    coordinates: {
      lat: Number,
      lng: Number,
    },
  },
  phone: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
  },
  logo: {
    type: String,
  },
  coverImage: {
    type: String,
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
  totalReviews: {
    type: Number,
    default: 0,
  },
  deliveryFee: {
    type: Number,
    default: 0,
  },
  minimumOrder: {
    type: Number,
    default: 0,
  },
  estimatedDeliveryTime: {
    type: Number, // in minutes
    default: 30,
  },
  isOpen: {
    type: Boolean,
    default: true,
  },
  openingHours: {
    monday: { open: String, close: String },
    tuesday: { open: String, close: String },
    wednesday: { open: String, close: String },
    thursday: { open: String, close: String },
    friday: { open: String, close: String },
    saturday: { open: String, close: String },
    sunday: { open: String, close: String },
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Auto-generate tenantId before validation if not set
restaurantSchema.pre('validate', function(next) {
  if (!this.tenantId) {
    this.tenantId = this._id;
  }
  next();
});

module.exports = mongoose.models.Restaurant || mongoose.model('Restaurant', restaurantSchema);