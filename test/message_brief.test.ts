import assert from "node:assert/strict";
import test from "node:test";
import { buildMessageBrief, draftRequestSchema } from "../src/message_brief";

test("a donor payment becomes a receipt brief with normalized currency", () => {
  const request = draftRequestSchema.parse({
    kind: "donor_receipt",
    requestId: "7bd74fd7-55d3-4df2-a7da-7ac39d7f5385",
    donorName: "Maya Chen",
    amount: 125,
    currency: "usd",
    donatedAt: "2026-08-20T14:30:00.000Z",
    campaignName: "Community Pantry",
  });

  const brief = buildMessageBrief(request);

  assert.equal(brief.subject, "Receipt for Community Pantry");
  assert.match(brief.instruction, /125\.00 USD/);
  assert.match(brief.instruction, /without adding tax or legal claims/);
});

test("a campaign snapshot becomes an internal report rather than donor copy", () => {
  const request = draftRequestSchema.parse({
    kind: "campaign_report",
    requestId: "229ff6b8-bd33-4a57-97ee-53be6245e2e4",
    campaignName: "Community Pantry",
    periodStart: "2026-08-01",
    periodEnd: "2026-08-31",
    donations: 42,
    amountRaised: 5250,
    currency: "USD",
    volunteerHours: 88,
  });

  const brief = buildMessageBrief(request);

  assert.equal(brief.subject, "Community Pantry campaign report");
  assert.match(brief.instruction, /42 donations/);
  assert.match(brief.instruction, /two practical follow-up questions/);
});
