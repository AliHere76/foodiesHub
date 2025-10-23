const { body, param, query, validationResult } = require('express-validator');

// Validation rules
const validationRules = {
  register: [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Invalid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').optional().isIn(['customer', 'restaurant']).withMessage('Invalid role'),
  ],

  login: [
    body('email').isEmail().normalizeEmail().withMessage('Invalid email'),
    body('password').notEmpty().withMessage('Password is required'),
  ],

  createRestaurant: [
    body('name').trim().notEmpty().withMessage('Restaurant name is required'),
    body('phone').trim().notEmpty().withMessage('Phone is required'),
    body('email').isEmail().withMessage('Invalid email'),
    body('description').optional().trim(),
    body('cuisine').optional().isArray(),
  ],

  createMenuItem: [
    body('name').trim().notEmpty().withMessage('Item name is required'),
    body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    body('category').isIn(['appetizer', 'main', 'dessert', 'beverage', 'side']).withMessage('Invalid category'),
    body('description').optional().trim(),
  ],

  createOrder: [
    body('restaurantId').notEmpty().withMessage('Restaurant ID is required'),
    body('items').isArray({ min: 1 }).withMessage('Order must have at least one item'),
    body('items.*.menuItem').notEmpty().withMessage('Menu item ID is required'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('deliveryAddress').notEmpty().withMessage('Delivery address is required'),
  ],

  updateOrderStatus: [
    body('status').isIn(['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'])
      .withMessage('Invalid order status'),
  ],
};

// Validation result handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  }
  next();
};

module.exports = { validationRules, handleValidationErrors };