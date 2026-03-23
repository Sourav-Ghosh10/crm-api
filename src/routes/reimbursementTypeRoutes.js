const express = require('express');
const reimbursementTypeController = require('../controllers/reimbursementTypeController');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
    createReimbursementTypeSchema,
    updateReimbursementTypeSchema,
    reimbursementTypeQuerySchema,
} = require('../validators/reimbursementTypeValidator');
const { idParamSchema } = require('../validators/commonValidator');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Publicly available to authenticated users
router.get('/active', reimbursementTypeController.getActiveTypes);


router
    .route('/')
    .post(validate(createReimbursementTypeSchema), reimbursementTypeController.createType)
    .get(validate(reimbursementTypeQuerySchema, 'query'), reimbursementTypeController.getAllTypes);

router
    .route('/:id')
    .put(validate(idParamSchema, 'params'), validate(updateReimbursementTypeSchema), reimbursementTypeController.updateType);

router.patch(
    '/:id/status',
    validate(idParamSchema, 'params'),
    validate(updateReimbursementTypeSchema), // Using this as it allows partial updates
    reimbursementTypeController.toggleStatus
);

module.exports = router;
