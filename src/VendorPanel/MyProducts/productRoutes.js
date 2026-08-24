import express from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  exportProductsCSV,
} from './productController.js';
import { protect } from '../Authentication/authMiddleware.js';

const router = express.Router();

router.get('/export-csv', protect, exportProductsCSV);

router.route('/')
  .get(protect, getProducts)
  .post(protect, createProduct);

router.route('/:id')
  .get(protect, getProductById)
  .put(protect, updateProduct)
  .delete(protect, deleteProduct);

export default router;
