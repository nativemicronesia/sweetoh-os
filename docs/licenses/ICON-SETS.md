# Studio icon and sticker sets

Served by the Studio from installed packages (data packaged by Iconify, https://iconify.design) through `/api/studio/icons`. Each set keeps its own license; only sets that allow commercial use without attribution are included.

| Set | License | Source |
| --- | --- | --- |
| Phosphor | MIT | https://github.com/phosphor-icons/core |
| Lucide | ISC | https://github.com/lucide-icons/lucide |
| Tabler | MIT | https://github.com/tabler/tabler-icons |
| Heroicons | MIT | https://github.com/tailwindlabs/heroicons |
| Iconoir | MIT | https://github.com/iconoir-icons/iconoir |
| Bootstrap Icons | MIT | https://github.com/twbs/icons |
| Remix Icon | Apache-2.0 | https://github.com/Remix-Design/RemixIcon |
| Material Design Icons | Apache-2.0 | https://github.com/Templarian/MaterialDesign |
| Fluent Emoji (flat) | MIT | https://github.com/microsoft/fluentui-emoji |

License texts ship in each `@iconify-json/<set>` package (`license.txt`) under `node_modules`. Saved designs store only an icon id such as `ph:sun-bold`; ids from any other set are rejected by the layout schema.
