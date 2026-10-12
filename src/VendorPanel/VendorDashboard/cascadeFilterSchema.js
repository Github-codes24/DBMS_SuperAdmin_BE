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

// project Schema 
const projectSchema = new mongoose.Schema(
  {
    projectId: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    categories: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

const categorySchema = new mongoose.Schema({
  categoryId: {
    type: String,
    unique: true,
    required: true,
  },
  name: {
    type: String,
    unique: true,
    required: true,
    trim: true,
  },
  url: {
    type: String,
    default: "",
  },
  vendorCount: {
    type: Number,
    default: 0,
  },
});

const subcategorySchema = new mongoose.Schema({
  subCategoryId: {
    type: String,
    unique: true,
    required: true,
   
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  url: {
    type: String,
    default: "",
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    required: true,
  },
  parentCategory: {
    type: String,
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
export const  Project = mongoose.model("Project", projectSchema);
