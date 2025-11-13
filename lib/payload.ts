export function normalizePayload(data: Record<string, unknown>) {
  const nextPayload: Record<string, unknown> = { ...data };
  if (!Array.isArray((data as Record<string, unknown>).items)) {
    const fallback: Array<Record<string, unknown>> = [];
    for (let i = 1; i <= 20; i++) {
      const name = toString(data[`item${i}_name` as keyof typeof data]);
      if (!name) continue;
      fallback.push({
        name,
        unitPrice: toString(data[`item${i}_unitPrice` as keyof typeof data]),
        unit: toString(data[`item${i}_unit` as keyof typeof data]),
        qty: toString(data[`item${i}_qty` as keyof typeof data]),
        amount: toString(data[`item${i}_amount` as keyof typeof data]),
        display: toString(data[`item${i}_display` as keyof typeof data]) || 'grid'
      });
    }
    if (fallback.length) {
      nextPayload.fallbackLineItems = fallback;
    }
  }
  return nextPayload;
}

function toString(value: unknown) {
  if (value === null || value === undefined) return '';
  return String(value);
}
