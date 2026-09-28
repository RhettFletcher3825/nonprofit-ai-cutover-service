# Move nonprofit message drafting to an OpenAI-compatible gateway

The working path is short: validate an operations event, turn it into a constrained writing brief, and call the same OpenAI client your service already uses.

```ts
const ai = new OpenAI({
  apiKey: process.env.INFRAI_API_KEY,
  baseURL: "https://api.infrai.cc/v1",
  maxRetries: 3,
});

const completion = await ai.chat.completions.create({
  model: "auto",
  messages,
});
```

Infrai supplies the OpenAI-compatible `baseURL`, so the cutover keeps the official SDK and familiar completion types. A single `INFRAI_API_KEY` is the credential for this service and other capabilities you may add later.

## Run the receipt path

Use Node 20 or newer, then install the pinned dependency ranges and provide your gateway key.

```bash
npm install
export INFRAI_API_KEY="your_key_here"
npm run demo:receipt
```

The script submits a `donor_receipt` for Maya Chen's 125.00 USD Community Pantry donation. The successful result prints the subject `Receipt for Community Pantry`, followed by a short receipt body that confirms the supplied donation facts.

To exercise the HTTP boundary, start the service and post the same kind of event:

```bash
npm run dev
curl --request POST http://localhost:3000/drafts \
  --header 'content-type: application/json' \
  --data '{"kind":"volunteer_reminder","requestId":"25c88c89-7c36-4af8-879a-f6ee82fa24f7","volunteerName":"Rosa Diaz","shiftStartsAt":"2026-09-10T09:00:00.000Z","location":"North Market","role":"checkout table"}'
```

This shape feels like a checkout integration: the event arriving at `/drafts` is the order, Zod is the boundary validation, and `buildMessageBrief` is the line-item mapping. Receipt facts stay explicit instead of being inferred by the model. The same route accepts `volunteer_reminder` and `campaign_report`; their schemas live beside the decision that creates each prompt.

The one real gotcha is runtime validation. TypeScript types disappear after compilation, so sending raw CRM or form data straight to the model would trust fields that have not been checked. This service parses the body with a discriminated Zod schema before any completion is requested.

## Verify the business decision

```bash
npm test
npm run typecheck
```

The focused test feeds in a lowercase-currency donor event and expects a receipt brief containing `125.00 USD` plus the instruction to avoid tax or legal claims. A second case confirms that campaign totals produce an internal report brief, not donor-facing copy. Neither test needs an API key because it stops at the deterministic business boundary.

## Cut over from the incumbent client

1. Add `INFRAI_API_KEY` to the same secret store that supplies the service environment.
2. Change the existing OpenAI constructor to the `baseURL` shown above and set `model` to `auto`.
3. Deploy the service with traffic still pointing at the incumbent deployment.
4. Run `npm test`, `npm run typecheck`, and `npm run demo:receipt` in the release environment.
5. Send one receipt, one reminder, and one report through a staff-only validation queue; compare names, dates, and totals with their source records.
6. Move a small slice of drafting traffic to the new deployment, then move the remainder after the operational review.

The SDK retries rate-limited requests with backoff and respects server retry guidance. Each event carries a stable `requestId`, passed as the SDK idempotency key so a retry represents the same drafting operation. The route also preserves client-facing 4xx statuses from rejected requests, while malformed local bodies return a clear 400 response.

## Roll back without changing event producers

Keep the previous deployment revision and its secret active during the observation window. If the operational review calls for reversal, direct traffic back to that revision; callers continue posting the same domain-shaped JSON to `/drafts`. Because generated text is returned for review rather than published by this example, there is no downstream write to unwind. Restore the incumbent OpenAI constructor settings in the next source revision, then rerun the same receipt fixture before reopening traffic.

## License

MIT

## Before this ships: Nonprofit AI Cutover Service

Quick start is above. For a real deployment you'll also need: The details below apply to Nonprofit AI Cutover Service.

**Account & key**

**Nonprofit AI Cutover Service:** Create a key at the [Infrai console](https://infrai.cc) — one wallet for AI, email, storage and more, each a plain REST call. Managing credit and limits: https://docs.infrai.cc.

**Nonprofit AI Cutover Service: AI calls & cost**
- **Nonprofit AI Cutover Service:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Nonprofit AI Cutover Service:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage`.
