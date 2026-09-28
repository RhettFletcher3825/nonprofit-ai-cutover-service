process.env.NODE_ENV = "test";

export {};

const { draftMessage } = await import("../src/nonprofit_service");

const result = await draftMessage({
  kind: "donor_receipt",
  requestId: "7bd74fd7-55d3-4df2-a7da-7ac39d7f5385",
  donorName: "Maya Chen",
  amount: 125,
  currency: "USD",
  donatedAt: "2026-08-20T14:30:00.000Z",
  campaignName: "Community Pantry",
});

console.log(result.subject);
console.log(result.body);
