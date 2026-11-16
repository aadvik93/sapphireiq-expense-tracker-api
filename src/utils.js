export function toMinorUnits(amount) {
  return Math.round(amount * 100);
}

export function fromMinorUnits(amountMinor) {
  return Number((amountMinor / 100).toFixed(2));
}

export function serializeExpense(expense) {
  const value = expense.toObject ? expense.toObject() : expense;
  const { amountMinor, ...rest } = value;
  return { ...rest, amount: fromMinorUnits(amountMinor) };
}

export function monthRange(month) {
  const start = new Date(`${month}-01T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);
  return { start, end };
}
