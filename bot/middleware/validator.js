const { body, validationResult } = require('express-validator');

/**
 * Middleware to handle validation results
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.warn(`⚠️ Validation Fail on ${req.originalUrl}:`, errors.array());
    return res.status(400).json({ 
      success: false, 
      error: 'Validation Error', 
      details: errors.array().map(e => ({ field: e.path, message: e.msg })) 
    });
  }
  next();
};

/**
 * Schemas for different routes
 */
const schemas = {
  order: [
    body('userId').notEmpty().withMessage('User ID is required'),
    body('items').isArray({ min: 1 }).withMessage('Items must be a non-empty array'),
    body('items.*.id').notEmpty().withMessage('Item ID is required'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('total').isFloat({ min: 0 }).withMessage('Total must be a positive number'),
    body('deliveryInfo').isObject().withMessage('Delivery info is required'),
    body('deliveryInfo.phone').notEmpty().trim().escape().withMessage('Phone number is required'),
    body('deliveryInfo.address').notEmpty().trim().escape().withMessage('Address is required'),
    body('idempotencyKey').optional().trim().escape().isString(),
    validate
  ],
  product: [
    body('name').notEmpty().trim().escape().isLength({ min: 2 }).withMessage('Name must be at least 2 chars'),
    body('price').isFloat({ min: 0 }).withMessage('Price must be positive'),
    body('category').notEmpty().trim().escape().withMessage('Category is required'),
    body('description').optional().trim().escape(),
    body('stock').optional().isInt({ min: 0 }),
    validate
  ],
  setting: [
    body('key').notEmpty().trim().escape().withMessage('Key is required'),
    body('value').exists().trim().escape().withMessage('Value must be provided'),
    validate
  ],
  coupon: [
    body('code').notEmpty().trim().escape().toUpperCase(),
    body('discount_type').isIn(['fixed', 'percent']),
    body('value').isFloat({ min: 0 }),
    validate
  ]
};

module.exports = schemas;
