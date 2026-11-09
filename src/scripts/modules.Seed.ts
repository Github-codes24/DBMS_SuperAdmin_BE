// import mongoose from "mongoose";
// import { Project } from "../models/Project";
// import { Module } from "../models/modules"
// import "dotenv/config";

// const project = {
//   projectId: "LTS",
//   name: "LTS",
//   description: "LTS platform",
//   status: "active",
//   type: "tenant",
// };

// const modulesByPanel: Record<string, { key: string; name: string }[]> = {
//   super_admin: [
//     { key: "super_admin_dashboard", name: "Super Admin Dashboard" },
//     { key: "category_subcategory", name: "Category & Sub-category" },
//     { key: "user_management", name: "User Management" },
//     { key: "roles_permissions", name: "Roles & Permissions" },
//     { key: "feature_control", name: "Feature Control" },
//     { key: "customer_database", name: "Customer Database" },
//     { key: "vendor_database", name: "Vendor Database" },
//     { key: "telecaller_management", name: "Telecaller Management" },
//     { key: "data_management", name: "Data Management" },
//     { key: "audit_logs", name: "Audit Logs" },
//   ],
//   telecaller: [
//     { key: "vendor_management", name: "Vendor Management" },
//     { key: "report", name: "Report" },
//     { key: "my_profile", name: "My Profile" },
//   ],
//   vendor: [
//     { key: "vendor_dashboard", name: "Vendor Dashboard" },
//     { key: "my_products", name: "My Products" },
//     { key: "orders", name: "Orders" },
//     { key: "customer_database", name: "Customer Database" },
//     { key: "telecaller_management", name: "Telecaller Management" },
//     { key: "sales_report", name: "Sales Report" },
//     { key: "profile_settings", name: "Profile & Settings" },
//     { key: "notification", name: "Notification" },
//     { key: "help_support", name: "Help & Support" },
//   ],
// };

// async function seed() {
//   await mongoose.connect(process.env.MONGODB_URI!);
//   await Module.syncIndexes();

//   const proj = await Project.findOneAndUpdate(
//     { projectId: project.projectId },
//     { $set: project },
//     { upsert: true, new: true, setDefaultsOnInsert: true }
//   );

//   for (const [panel, modules] of Object.entries(modulesByPanel)) {
//     for (let i = 0; i < modules.length; i++) {
//       const m = modules[i];
//       await Module.updateOne(
//         { projectId: proj._id, panel, key: m.key },
//         {
//           $set: {
//             ...m,
//             panel,
//             sortOrder: i + 1, // keeps the order you listed them in
//             projectId: proj._id,
//             projectName: proj.name,
//           },
//         },
//         { upsert: true }
//       );
//     }
//     console.log(`Seeded ${modules.length} modules for panel: ${panel}`);
//   }

//   await mongoose.disconnect();
// }

// seed().catch((err) => {
//   console.error(err);
//   process.exit(1);
// });


import "dotenv/config";
import mongoose from "mongoose";
import { Project } from "../models/Project"
import { Module } from "../models/modules"

const PROJECT = {
  projectId: "edu-merit",
  name: "Edu Merit", // change if the official name differs
  status: "active",
  type: "tenant",
};

const slug = (s: string) =>
  s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

const panels: Record<string, string[]> = {
  super_admin: [
    "Dashboard", "Institutions", "Campuses", "Institution Admins", "Subscriptions", "Plans",
    "Module Activation", "Users", "Roles & Permissions", "Platform Settings", "Notifications",
    "Integrations", "Audit Logs", "Support", "Platform Reports",
  ],
  school: [
    "Dashboard", "Institution Setup", "Campus", "Academic Year", "Departments", "Classes/Courses",
    "Sections/Batches", "Subjects", "Rooms", "Users", "Admissions", "Academics", "Timetable",
    "Attendance", "Fees", "Examination", "Library", "Transport", "Hostel", "Inventory", "HR",
    "Communication", "Reports", "Certificates", "Helpdesk", "Settings",
  ],
  finance: [
    "Dashboard", "Fee Heads", "Fee Structure", "Student Fees", "Invoices", "Payments", "Receipts",
    "Concessions", "Scholarships", "Refunds", "Income", "Expenses", "Ledger", "Bank", "Cash",
    "Vendors", "Purchases", "Reconciliation", "Payroll Support", "Reports",
  ],
  sales: [
    "Dashboard", "Leads", "Enquiries", "Lead Sources", "Counselling", "Follow-ups", "Calls",
    "Messages", "Applications", "Admission Pipeline", "Conversion Reports",
  ],
  student_parent: [
    "Dashboard", "Profile", "Class/Course", "Subjects", "Timetable", "Syllabus", "Homework",
    "Assignments", "Attendance", "Examination", "Results", "Report Card", "Fees", "Payments",
    "Receipts", "Library", "Transport", "Hostel", "Certificates", "Notices", "Events",
    "Complaints", "Notifications",
  ],
  teacher: [
    "Dashboard", "My Class", "Students", "Attendance", "Timetable", "Subjects", "Syllabus",
    "Lesson Plans", "Homework", "Assignments", "Examination", "Marks", "Performance",
    "Parent Communication", "Notices", "Leave", "Reports", "My Subjects", "My Classes",
    "Chapters", "Evaluation", "Communication",
  ],
  hr: [
    "Dashboard", "Employee Master", "Departments", "Designations", "Documents", "Attendance",
    "Leave", "Recruitment", "Salary/Payroll", "Onboarding", "Exit", "HR Reports",
  ],
  management_director: [
    "Dashboard", "Student Analytics", "Admission Analytics", "Attendance Analytics",
    "Academic Performance", "Fee Analytics", "Staff Analytics", "Operational Overview", "Reports",
  ],
};

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI!); // keep your existing connection line
  await Module.syncIndexes();

  const project = await Project.findOneAndUpdate(
    { projectId: PROJECT.projectId },
    { $set: PROJECT },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );

  let total = 0;
  for (const [panel, names] of Object.entries(panels)) {
    await Module.bulkWrite(
      names.map((name, i) => ({
        updateOne: {
          filter: { projectId: project._id, panel, key: slug(name) },
          update: {
            $set: {
              projectId: project._id,
              projectName: project.name,
              panel,
              key: slug(name),
              name,
              sortOrder: i + 1,
              isActive: true,
            },
          },
          upsert: true,
        },
      }))
    );
    total += names.length;
    console.log(`${panel}: ${names.length} modules`);
  }

  console.log(`Seeded ${total} modules for ${project.name}`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});