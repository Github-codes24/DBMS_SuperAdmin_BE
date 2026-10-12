
import "dotenv/config";
import mongoose from "mongoose";
import { readFile } from "node:fs/promises";

// Register the models defined in this file.
import "./src/VendorPanel/VendorDashboard/cascadeFilterSchema.js";

const Category = mongoose.models.Category;
const Subcategory = mongoose.models.Subcategory;

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

function slugify(value) {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}



function parseMarkdownTable(content) {
    const categoryNames = [
      "Home Applicances & Repair Service",
      "Software Development Service",
      "Computer Training Institute",
      "Hospitals and Clinics",
      "Water Purifier Service",
      "Electrician Service",
      "Carpenter Service",
      "Pest Control Service",
      "Hotels & Resorts",
      "Travel & Tours",
      "Car Repair Service",
      "Mobile Service",
      "Plumber Service",
      "AC Service",
      "Grocery Stores",
      "Saloons",
      "Doctors",
      "Gym",
      "plumber",
      "test category",
    ].sort((a, b) => b.length - a.length);
  
    const rows = [];
  
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || /^category\s+subcategory$/i.test(trimmed)) {
        continue;
      }
  
      const categoryName = categoryNames.find(
        (name) =>
          trimmed.startsWith(name) &&
          /\s/.test(trimmed[name.length] ?? "")
      );
  
      if (!categoryName) continue;
  
      const subCategoryName = trimmed
        .slice(categoryName.length)
        .trim();
  
      if (!subCategoryName) continue;
  
      rows.push({ categoryName, subCategoryName });
    }
  
    return rows;
  }
  
async function seedCategories() {
  if (!MONGO_URI) {
    throw new Error("Set MONGO_URI or MONGODB_URI in your .env file.");
  }

  if (!Category || !Subcategory) {
    throw new Error(
      "Category or Subcategory model was not registered. Check the model names in cascadeFilterSchema.js."
    );
  }

  const content = await readFile("data/categories.md", "utf8");
  const rows = parseMarkdownTable(content);

  if (rows.length === 0) {
    throw new Error("No category/subcategory rows found. Nothing was deleted.");
  }

  // Preserve category order from the source file.
  const categoryNames = [...new Set(rows.map((row) => row.categoryName))];

  // Prepare and validate all input before deleting existing records.
  const categoryDocs = categoryNames.map((name, index) => {
    const categoryId = `CAT-${String(index + 1).padStart(3, "0")}`;

    return {
      categoryId,
      name,
      url: `/subcategory/${categoryId}/${slugify(name)}`,
      vendorCount: 0,
    };
  });

  const categoryIdByName = new Map(
    categoryDocs.map((category) => [category.name, category.categoryId])
  );

  const subcategoryDocs = rows.map((row, index) => {
    const categoryId = categoryIdByName.get(row.categoryName);
    const subCategoryId = `SUBCAT-${String(index + 1).padStart(3, "0")}`;

    return {
      subCategoryId,
      name: row.subCategoryName,
      url: `/service/${categoryId}/${subCategoryId}/nagpur/${slugify(
        row.subCategoryName
      )}`,
      parentCategory: row.categoryName,
      vendorCount: 0,
    };
  });

  // Connect to MongoDB.
  await mongoose.connect(MONGO_URI);

  try {
    // Replace only these two collections.
    await Subcategory.deleteMany({});
    await Category.deleteMany({});

    const insertedCategories = await Category.insertMany(categoryDocs);

    const mongoIdByCategoryName = new Map(
      insertedCategories.map((category) => [
        category.name,
        category._id,
      ])
    );

    const finalSubcategories = subcategoryDocs.map((subcategory, index) => ({
      ...subcategory,
      category: mongoIdByCategoryName.get(rows[index].categoryName),
    }));

    await Subcategory.insertMany(finalSubcategories);

    console.log("Category seeding completed.");
    console.log(`Categories inserted: ${insertedCategories.length}`);
    console.log(`Subcategories inserted: ${finalSubcategories.length}`);
  } finally {
    await mongoose.disconnect();
  }
}

seedCategories().catch((error) => {
  console.error("Category seeding failed:", error);
  process.exitCode = 1;
});
