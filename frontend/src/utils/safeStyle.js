export function safeStyle(value) {
  if (!value) return undefined;

  if (Array.isArray(value)) {
    return value.reduce((merged, entry) => {
      const normalized = safeStyle(entry);
      return normalized ? { ...merged, ...normalized } : merged;
    }, {});
  }

  if (typeof value === "object") {
    return value;
  }

  return undefined;
}
