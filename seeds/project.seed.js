
import "dotenv/config";
import mongoose from "mongoose";
import {Project} from "../src/VendorPanel/VendorDashboard/cascadeFilterSchema.js"
import {Category} from "../src/VendorPanel/VendorDashboard/cascadeFilterSchema.js"

const projects = [
  { projectId: "PID-001", name: "CSR" },
  { projectId: "PID-002", name: "CRM" },
  { projectId: "PID-003", name: "Real Estate" },
  { projectId: "PID-004", name: "EDU-Merit" },
  { projectId: "PID-005", name: "DBMS" },
];

async function seedProjects() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error("MONGO_URI or MONGODB_URI is missing in .env");
  }

  await mongoose.connect(mongoUri);

  try {
    // Find all existing category IDs
    const categoryIds = await Category.distinct("categoryId");

    if (categoryIds.length === 0) {
      throw new Error("No categories found. Seed categories first.");
    }

    // Create projects or update their existing records
    for (const project of projects) {
      const update = {
        $setOnInsert: { name: project.name },
      };

      // Assign existing categories only to DBMS
      if (project.projectId === "PID-005") {
        update.$set = { categories: categoryIds };
      } else {
        update.$setOnInsert.categories = [];
      }

      await Project.updateOne(
        { projectId: project.projectId },
        { ...update, $setOnInsert: {
          ...update.$setOnInsert,
          projectId: project.projectId,
        }},
        { upsert: true, runValidators: true }
      );
    }

    console.log("Projects seeded successfully.");
    console.log("Total categories assigned to DBMS:", categoryIds.length);

    const result = await Project.find()
      .select("projectId name categories")
      .sort({ projectId: 1 })
      .lean();

    console.log(result);
  } finally {
    await mongoose.disconnect();
  }
}
seedProjects().catch((error) => {
  console.error("Project seeding failed:", error);
  process.exitCode = 1;
});
