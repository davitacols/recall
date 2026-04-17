export function buildAskRecallPath(question) {
  const normalizedQuestion = String(question || "").trim();
  if (!normalizedQuestion) return "/ask-recall";

  const params = new URLSearchParams({
    q: normalizedQuestion,
    autorun: "1",
  });

  return `/ask-recall?${params.toString()}`;
}
