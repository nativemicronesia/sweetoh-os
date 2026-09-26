# SweetOh Creative Library foundation

The `asset` row remains the authority for file bytes, venture ownership, uploader, review status and storage key. `creative_library_entry` is a one-to-one metadata extension keyed by `asset_id`; it carries normalized creative kind/category/tags, production relevance, source/license evidence and each reuse permission. It does not copy files into a parallel asset store.

The vocabulary covers elements, vectors, stickers, patterns, textures, backgrounds, fonts, illustrations, frames/shapes, templates and production assets. Production methods are relevance tags only. They do not advertise a shop capability; the currently confirmed SweetOh shop methods are sublimation and engraving.

Legacy assets without an entry keep the established same-venture Studio workflow. Approved legacy SweetOh designs remain eligible for customer design use. No legacy or external asset gains source redistribution rights by default. External resources stay unavailable until a partner/owner records the original source, license and evidence, then explicitly verifies the rights. Commercial use, modification, redistribution and attribution are checked separately for each intended use; an attribution requirement without recorded text fails closed.

`searchCreativeLibrary` is the venture-scoped, rights-filtered search boundary for Studio and future SweetOh AI/Green Tree Skink tools. AI and agent work is not activated by this foundation. Static SweetOh-created Studio graphics and fonts continue through the existing vetted registries; their explicit source/license metadata is normalized through the same usage policy.

Migration application was not performed. Before applying `0030_creative_library.sql`, reconcile the existing migration journal and pending migration files and verify the live database state. The table is additive and references existing assets; it does not rewrite or migrate their files.
