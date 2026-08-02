# Golden path: AI generator

Use this path for a product that creates text, images, or other generated
assets.

1. Define the product capability and credit cost before exposing generation.
2. Make the request create an idempotent Job; the handler records external
   effects and retry state.
3. Deduct credits atomically through the ledger and associate the operation
   with the job idempotency key.
4. Persist generated files through the Asset service and authorize access by
   asset visibility, not raw storage keys.
5. Route multi-step or human-approval work to a Cloudflare Workflow.

Provider prompts, models, and generation UX remain product-owned.
