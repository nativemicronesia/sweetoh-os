"use client";

import Link from "next/link";
import { STUDIO_TEMPLATES } from "@/lib/studio/templates";
import { TemplatePreview, useTemplateFonts } from "../canvas/template-preview";

/** Studio home: start a new 12 × 16 in design already laid out from a template. */
export function TemplateShelf() {
  useTemplateFonts(STUDIO_TEMPLATES);
  return (
    <ul className="sh-templates">
      {STUDIO_TEMPLATES.map((template) => (
        <li key={template.id}>
          <Link href={`/partner/canvas?new=portrait&tpl=${template.id}`} className="sh-template" aria-label={`Start from the ${template.name} template`}>
            <TemplatePreview template={template} ink="#101828" />
            <strong>{template.name}</strong>
            <small>{template.category}</small>
          </Link>
        </li>
      ))}
    </ul>
  );
}
