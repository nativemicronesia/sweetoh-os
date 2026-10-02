# Data inventory (facts for your terms and privacy wording, not legal advice)

What Sweet'Oh Studio holds about a creator and where it goes. Have a lawyer turn this into the privacy policy and terms.

| Data | Where it lives | Why | Who else sees it |
| --- | --- | --- | --- |
| Name, email, role | Database (Supabase Postgres) and Supabase Auth | Account and sign-in | Supabase |
| Password | Supabase Auth only (hashed); never in our tables | Sign-in | Supabase |
| Brand memory, Skink conversations | Database | Personalized help | Prompts are sent to the AI provider (OpenAI via the Dekaz router) when Skink answers |
| Saved designs (layouts) and uploaded or generated images | Database plus Supabase Storage | The product | Supabase |
| Credits history and plan | Database | Billing and limits | Stripe holds payment details; we store Stripe ids only |
| Printify token | Database, AES-GCM encrypted | Send products to the creator's own Printify | Printify when products are sent |
| Browser error reports | Server logs (no account or design content) | Reliability | Vercel |
| Autosaved drafts and recent colors | The creator's own browser | Recovery and convenience | Nobody |

Processors in use: Supabase (database, auth, storage), Vercel (hosting, logs), OpenAI (AI), Stripe (payments), Resend (email), Printify (fulfilment, only when the creator sends a product).

Creators can download their data from Studio, Settings, "Your data". Deleting a single memory is available in Studio. Full account deletion is not built yet (see `docs/SECURITY.md`).

Questions the policy must answer: how long conversations and images are kept after an account closes; whether prompts may be used to improve models (today: no training use is configured by us, but confirm the provider's current terms); fonts and icons used (open licenses listed in `docs/licenses`); who owns uploaded and generated artwork and what rights the creator warrants.
