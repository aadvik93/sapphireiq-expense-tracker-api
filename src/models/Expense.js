import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema(
  {
    // Integer minor units avoid floating point rounding in financial totals.
    amountMinor: { type: Number, required: true, min: 1, validate: Number.isSafeInteger },
    category: { type: String, required: true, trim: true, lowercase: true, maxlength: 50, index: true },
    date: { type: Date, required: true, index: true },
    description: { type: String, trim: true, maxlength: 500, default: '' },
    merchant: { type: String, trim: true, maxlength: 120, default: '' },
  },
  { timestamps: true, versionKey: false },
);

expenseSchema.index({ date: -1, category: 1 });

export const Expense = mongoose.model('Expense', expenseSchema);
