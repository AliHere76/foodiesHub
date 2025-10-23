const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true,
    index: true,
  },
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  category: {
    type: String,
    required: true,
    enum: ['appetizer', 'main', 'dessert', 'beverage', 'side'],
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  image: {
    type: String,
  },
  isVegetarian: {
    type: Boolean,
    default: false,
  },
  isVegan: {
    type: Boolean,
    default: false,
  },
  isGlutenFree: {
    type: Boolean,
    default: false,
  },
  spiceLevel: {
    type: String,
    enum: ['none', 'mild', 'medium', 'hot'],
    default: 'none',
  },
  preparationTime: {
    type: Number, // in minutes
    default: 15,
  },
  isAvailable: {
    type: Boolean,
    default: true,
  },
  ingredients: [{
    type: String,
  }],
  allergens: [{
    type: String,
  }],
  nutrition: {
    calories: Number,
    protein: Number,
    carbs: Number,
    fat: Number,
  },
}, {
  timestamps: true,
});

// Compound index for tenant-specific queries
menuItemSchema.index({ tenantId: 1, category: 1 });
menuItemSchema.index({ tenantId: 1, isAvailable: 1 });

module.exports = mongoose.models.MenuItem || mongoose.model('MenuItem', menuItemSchema);