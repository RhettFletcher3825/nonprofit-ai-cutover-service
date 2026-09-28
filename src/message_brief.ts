import { z } from "zod";

export const draftRequestSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("donor_receipt"),
    requestId: z.string().uuid(),
    donorName: z.string().trim().min(1),
    amount: z.number().positive(),
    currency: z.string().trim().length(3).transform((value) => value.toUpperCase()),
    donatedAt: z.string().datetime(),
    campaignName: z.string().trim().min(1),
  }),
  z.object({
    kind: z.literal("volunteer_reminder"),
    requestId: z.string().uuid(),
    volunteerName: z.string().trim().min(1),
    shiftStartsAt: z.string().datetime(),
    location: z.string().trim().min(1),
    role: z.string().trim().min(1),
  }),
  z.object({
    kind: z.literal("campaign_report"),
    requestId: z.string().uuid(),
    campaignName: z.string().trim().min(1),
    periodStart: z.string().date(),
    periodEnd: z.string().date(),
    donations: z.number().int().nonnegative(),
    amountRaised: z.number().nonnegative(),
    currency: z.string().trim().length(3).transform((value) => value.toUpperCase()),
    volunteerHours: z.number().nonnegative(),
  }),
]);

export type DraftRequest = z.infer<typeof draftRequestSchema>;

export type MessageBrief = {
  subject: string;
  instruction: string;
};

export function buildMessageBrief(request: DraftRequest): MessageBrief {
  switch (request.kind) {
    case "donor_receipt":
      return {
        subject: `Receipt for ${request.campaignName}`,
        instruction: `Write a concise donation receipt for ${request.donorName}. Confirm ${request.amount.toFixed(2)} ${request.currency}, donated at ${request.donatedAt}, for ${request.campaignName}. Thank the donor without adding tax or legal claims.`,
      };
    case "volunteer_reminder":
      return {
        subject: `Reminder: ${request.role} shift`,
        instruction: `Write a friendly shift reminder for ${request.volunteerName}. The ${request.role} shift starts at ${request.shiftStartsAt} at ${request.location}. Ask them to reply to their coordinator if plans changed.`,
      };
    case "campaign_report":
      return {
        subject: `${request.campaignName} campaign report`,
        instruction: `Write a plain-language internal campaign summary for ${request.periodStart} through ${request.periodEnd}. Report ${request.donations} donations, ${request.amountRaised.toFixed(2)} ${request.currency} raised, and ${request.volunteerHours} volunteer hours. Keep every number exactly as supplied and end with two practical follow-up questions.`,
      };
  }
}
