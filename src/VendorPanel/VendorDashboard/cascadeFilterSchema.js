import mongoose from 'mongoose';

// State Schema
const stateSchema = new mongoose.Schema({
  name: {
    type: String,
    unique: true,
    required: true,
    trim: true,
  },
  vendorCount: {
    type: Number,
    default: 0,
  },
});

// Category Schema
const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    unique: true,
    required: true,
    trim: true,
  },
  vendorCount: {
    type: Number,
    default: 0,
  },
});

// Subcategory Schema
const subcategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  parentCategory: {
    type: String, // String matching parent category name
    required: true,
  },
  vendorCount: {
    type: Number,
    default: 0,
  },
});

// Indexes for unique composite index on name + parentCategory
subcategorySchema.index({ name: 1, parentCategory: 1 }, { unique: true });

export const State = mongoose.model('State', stateSchema);
export const Category = mongoose.model('Category', categorySchema);
export const Subcategory = mongoose.model('Subcategory', subcategorySchema);
