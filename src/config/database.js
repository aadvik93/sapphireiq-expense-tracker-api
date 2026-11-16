import mongoose from 'mongoose';
import { Expense } from '../models/Expense.js';
import { Budget } from '../models/Budget.js';

export async function connectDatabase(uri = process.env.MONGODB_URI) {
  if (!uri) throw new Error('MONGODB_URI is not configured. Copy .env.example to .env and set it.');
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  await Promise.all([Expense.init(), Budget.init()]);
  console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
}
