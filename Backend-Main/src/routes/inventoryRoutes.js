import express from 'express';
import { body, query } from 'express-validator';
import {
  getAllItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
  getLowStockItems,
  recordUsage,
  recordRestock,
} from '../controllers/inventoryController.js';
import { authenticateToken } from '../middleware/auth.js';
import { handleValidationErrors } from '../middleware/validation.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * GET /api/inventory
 * Get all inventory items
 */
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('category').optional(),
    query('search').optional().trim(),
  ],
  handleValidationErrors,
  getAllItems
);

/**
 * GET /api/inventory/low-stock
 * Get low stock items (must be before :id routes)
 */
router.get('/low-stock', getLowStockItems);

/**
 * POST /api/inventory
 * Create new inventory item
 */
router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('Item name is required'),
    body('category').optional().trim(),
    body('current_stock').optional().isInt({ min: 0 }).toInt(),
    body('minimum_stock_threshold').optional().isInt({ min: 0 }).toInt(),
    body('unit_cost').optional().isFloat({ min: 0 }),
    body('supplier_id').optional().isUUID(),
  ],
  handleValidationErrors,
  createItem
);

/**
 * GET /api/inventory/:id
 * Get inventory item by ID
 */
router.get('/:id', getItemById);

/**
 * PUT /api/inventory/:id
 * Update inventory item
 */
router.put(
  '/:id',
  [
    body('name').optional().trim(),
    body('category').optional().trim(),
    body('minimum_stock_threshold').optional().isInt({ min: 0 }).toInt(),
    body('unit_cost').optional().isFloat({ min: 0 }),
    body('supplier_id').optional().isUUID(),
  ],
  handleValidationErrors,
  updateItem
);

/**
 * DELETE /api/inventory/:id
 * Delete inventory item
 */
router.delete('/:id', deleteItem);

/**
 * POST /api/inventory/:id/use
 * Record usage/consumption
 */
router.post(
  '/:id/use',
  [
    body('quantity').isInt({ min: 1 }).withMessage('Quantity must be positive'),
    body('notes').optional().trim(),
  ],
  handleValidationErrors,
  recordUsage
);

/**
 * POST /api/inventory/:id/restock
 * Record restocking/purchase
 */
router.post(
  '/:id/restock',
  [
    body('quantity').isInt({ min: 1 }).withMessage('Quantity must be positive'),
    body('notes').optional().trim(),
  ],
  handleValidationErrors,
  recordRestock
);

export default router;
