# Brand topology — Sweet'Oh first

Status: **LOCKED** for v1 launch sequencing.

## Brands

| Brand | Role |
|-------|------|
| **Sweet'Oh Creations** | Standalone brand. Local print-on-demand shop for NMH. Own domain, own site, own ops. **Launches first.** |
| **Island Sprouts** | Standalone brand. Main commercial “building.” Refined now; **launches soon after** Sweet'Oh. Connects to Sweet'Oh to power some custom / POD products. |

## Metaphor

- Island Sprouts = the **main building** (own brand, site, domain).
- Sweet'Oh = a **dedicated room** inside that building *and* its **own front door** (own brand, site, domain).
- Sweet'Oh is not a sub-brand of Island Sprouts. Island Sprouts is not a skin over Sweet'Oh.

## NMH shell

**NMH OS** is the login / portfolio shell. The Sweet'Oh partner signs into NMH and is handed into **Sweet'Oh OS** (`sweetoh-os`) to work — she does not need a separate mental model of “another company login.”

- Distinct app/repo (this one), reached from NMH via redirect / CTA (`SWEETOH_OS_URL`).
- Do **not** rebuild Sweet'Oh partner UI inside NMH.

## Partner-first (primary job)

The Sweet'Oh partner already sells via Facebook. Her day-one job in this OS:

1. Photograph / scan a product she built  
2. Sweet'Oh AI prepares the listing draft  
3. She reviews, publishes, and manages catalog  
4. Hard work stays **production and fulfillment**

See [`PARTNER-OPS.md`](./PARTNER-OPS.md).

## Day-one host

**This repo (`sweetoh-os`) is the Sweet'Oh front door + partner ops vehicle.**

- Customer site: homepage, products, create/AI, cart, checkout (secondary while Facebook is live)
- Ops: partner workspace (photo → AI → publish → orders)
- Venture slug: `sweetoh` (`SWEETOH_VENTURE_SLUG`)

Island Sprouts OS keeps the **room** surfaces for the later Island Sprouts launch. Do not block Sweet'Oh go-live on Island Sprouts polish.

## Shared vs separate

| Shared (contract later) | Separate now |
|-------------------------|--------------|
| Studio → product → Sweet'Oh fulfillment concepts | Deployments, domains, brand tokens |
| POD / custom product handoff when Island Sprouts launches | Catalog seed, Resend from-address, Stripe webhook for this app |
| NMH login shell → Sweet'Oh partner home | Sweet'Oh partner UI lives only in this repo |

## Do not

- Merge Sweet'Oh back into Island Sprouts as a sub-brand
- Require Island Sprouts email / env for Sweet'Oh-only deploys
- Build NMH portfolio intelligence inside this repo
- Gate partner publish behind an owner Command Center for v1
