import mongoose from 'mongoose';

const budgetSchema = new mongoose.Schema(
  {
    month: { type: String, required: true, unique: true, match: /^\d{4}-(0[1-9]|1[0-2])$/ },
    limitMinor: { type: Number, required: true, min: 1, validate: Number.isSafeInteger },
    alertThreshold: { type: Number, required: true, min: 1, max: 1000, default: 100 },
  },
  { timestamps: true, versionKey: false },
);

export const Budget = mongoose.model('Budget', budgetSchema);
