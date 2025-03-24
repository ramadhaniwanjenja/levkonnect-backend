const { body, param, query, validationResult } = require('express-validator');

// Centralized validation error handler
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// User validation rules
const userValidationRules = {
  register: [
    body('username').isLength({ min: 3 }).withMessage('Username must be at least 3 characters long'),
    body('email').isEmail().withMessage('Must be a valid email address'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    body('first_name').notEmpty().withMessage('First name is required'),
    body('last_name').notEmpty().withMessage('Last name is required'),
    body('user_type').isIn(['client', 'engineer']).withMessage('User type must be either client or engineer')
  ],
  
  login: [
    body('email').isEmail().withMessage('Must be a valid email address'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  
  updateProfile: [
    body('first_name').optional(),
    body('last_name').optional(),
    body('phone_number').optional().isMobilePhone().withMessage('Must be a valid phone number'),
    body('profile_image').optional().isURL().withMessage('Must be a valid URL')
  ],
  
  changePassword: [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters long')
  ]
};

// Engineer profile validation rules
const engineerValidationRules = {
  updateProfile: [
    body('title').optional(),
    body('bio').optional(),
    body('skills').optional(),
    body('experience_years').optional().isInt({ min: 0 }).withMessage('Experience years must be a positive number'),
    body('hourly_rate').optional().isFloat({ min: 0 }).withMessage('Hourly rate must be a positive number'),
    body('availability').optional().isIn(['available', 'partially_available', 'not_available']),
    body('location').optional()
  ]
};

// Client profile validation rules
const clientValidationRules = {
  updateProfile: [
    body('company_name').optional(),
    body('company_size').optional(),
    body('industry').optional(),
    body('description').optional(),
    body('website').optional().isURL().withMessage('Must be a valid URL'),
    body('location').optional()
  ]
};

// Job validation rules
const jobValidationRules = {
  create: [
    body('title').notEmpty().withMessage('Title is required'),
    body('description').notEmpty().withMessage('Description is required'),
    body('category').notEmpty().withMessage('Category is required'),
    body('budget').optional().isFloat({ min: 0 }).withMessage('Budget must be a positive number'),
    body('duration').optional(),
    body('location').optional(),
    body('remote_work').optional().isBoolean(),
    body('skills_required').optional()
  ],
  
  update: [
    param('id').isInt().withMessage('Job ID must be an integer'),
    body('title').optional(),
    body('description').optional(),
    body('category').optional(),
    body('budget').optional().isFloat({ min: 0 }).withMessage('Budget must be a positive number'),
    body('duration').optional(),
    body('location').optional(),
    body('remote_work').optional().isBoolean(),
    body('skills_required').optional(),
    body('status').optional().isIn(['open', 'in_progress', 'completed', 'cancelled'])
  ],
  
  search: [
    query('category').optional(),
    query('location').optional(),
    query('remote_work').optional().isBoolean(),
    query('skills').optional(),
    query('min_budget').optional().isFloat({ min: 0 }),
    query('max_budget').optional().isFloat({ min: 0 }),
    query('status').optional().isIn(['open', 'in_progress', 'completed', 'cancelled']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 })
  ]
};

// Bid validation rules
const bidValidationRules = {
  create: [
    body('job_id').isInt().withMessage('Job ID must be an integer'),
    body('amount').isFloat({ min: 0 }).withMessage('Bid amount must be a positive number'),
    body('proposal').notEmpty().withMessage('Proposal is required'),
    body('duration').optional()
  ],
  
  update: [
    param('id').isInt().withMessage('Bid ID must be an integer'),
    body('amount').optional().isFloat({ min: 0 }).withMessage('Bid amount must be a positive number'),
    body('proposal').optional(),
    body('duration').optional()
  ],
  
  updateStatus: [
    param('id').isInt().withMessage('Bid ID must be an integer'),
    body('status').isIn(['accepted', 'rejected']).withMessage('Status must be either accepted or rejected')
  ]
};

// Project validation rules
const projectValidationRules = {
  create: [
    body('job_id').isInt().withMessage('Job ID must be an integer'),
    body('bid_id').isInt().withMessage('Bid ID must be an integer'),
    body('title').notEmpty().withMessage('Title is required'),
    body('description').optional(),
    body('start_date').optional().isDate().withMessage('Start date must be a valid date'),
    body('end_date').optional().isDate().withMessage('End date must be a valid date')
  ],
  
  update: [
    param('id').isInt().withMessage('Project ID must be an integer'),
    body('title').optional(),
    body('description').optional(),
    body('start_date').optional().isDate().withMessage('Start date must be a valid date'),
    body('end_date').optional().isDate().withMessage('End date must be a valid date'),
    body('status').optional().isIn(['not_started', 'in_progress', 'completed', 'cancelled'])
  ]
};

// Milestone validation rules
const milestoneValidationRules = {
  create: [
    body('project_id').isInt().withMessage('Project ID must be an integer'),
    body('title').notEmpty().withMessage('Title is required'),
    body('description').optional(),
    body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
    body('due_date').optional().isDate().withMessage('Due date must be a valid date')
  ],
  
  update: [
    param('id').isInt().withMessage('Milestone ID must be an integer'),
    body('title').optional(),
    body('description').optional(),
    body('amount').optional().isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
    body('due_date').optional().isDate().withMessage('Due date must be a valid date'),
    body('status').optional().isIn(['pending', 'in_progress', 'submitted', 'approved', 'rejected'])
  ]
};

// Payment validation rules
const paymentValidationRules = {
  create: [
    body('project_id').isInt().withMessage('Project ID must be an integer'),
    body('milestone_id').optional().isInt().withMessage('Milestone ID must be an integer'),
    body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
    body('payment_method').notEmpty().withMessage('Payment method is required')
  ]
};

// Review validation rules
const reviewValidationRules = {
  create: [
    body('project_id').isInt().withMessage('Project ID must be an integer'),
    body('reviewee_id').isInt().withMessage('Reviewee ID must be an integer'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('comment').optional()
  ]
};

module.exports = {
  validate,
  userValidationRules,
  engineerValidationRules,
  clientValidationRules,
  jobValidationRules,
  bidValidationRules,
  projectValidationRules,
  milestoneValidationRules,
  paymentValidationRules,
  reviewValidationRules
};