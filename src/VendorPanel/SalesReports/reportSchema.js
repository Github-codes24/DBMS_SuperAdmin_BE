import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema(
  {
    reportId: {
      type: String,
      unique: true,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
    },
    period: {
      type: String,
      enum: ['Daily Summary', 'Weekly Aggregate', 'Monthly Analytics'],
      default: 'Weekly Aggregate',
    },
    customersCount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['Active (Generating)', 'Disabled (Archived)'],
      default: 'Active (Generating)',
    },
    vendorId: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const Report = mongoose.model('Report', reportSchema);
export default Report;
