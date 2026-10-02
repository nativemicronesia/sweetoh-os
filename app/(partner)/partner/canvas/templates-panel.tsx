"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { TEMPLATE_CATEGORIES, STUDIO_TEMPLATES, type StudioTemplate } from "@/lib/studio/templates";
import { TemplatePreview, useTemplateFonts } from "./template-preview";

export function TemplatesPanel({ disabled, hasContent, onApply }: { disabled: boolean; hasContent: boolean; onApply: (template: StudioTemplate) => void }) {
  const [category, setCategory] = useState<string>("All");
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState<StudioTemplate | null>(null);
  useTemplateFonts(STUDIO_TEMPLATES);
  const shown = useMemo(() => STUDIO_TEMPLATES.filter((template) => (category === "All" || template.category === category) && (!query.trim() || template.name.toLowerCase().includes(query.trim().toLowerCase()) || template.category.toLowerCase().includes(query.trim().toLowerCase()))), [category, query]);
  const choose = (template: StudioTemplate) => { if (hasContent) setPending(template); else onApply(template); };
  return (
    <div className="pe-panel-body tp">
      <label className="el-search">
        <Search size={15} aria-hidden />
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search templates" aria-label="Search templates" />
        {query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search"><X size={14} /></button>}
      </label>
      <div className="el-tabs" role="tablist" aria-label="Template category">
        {["All", ...TEMPLATE_CATEGORIES].map((value) => <button key={value} type="button" role="tab" aria-selected={category === value} onClick={() => setCategory(value)}>{value}</button>)}
      </div>
      {pending && (
        <div className="tp-confirm" role="alertdialog" aria-label="Replace design">
          <p><strong>Replace your design?</strong> “{pending.name}” starts a fresh layout on this view. You can undo it.</p>
          <div><button type="button" className="pe-btn pe-btn-primary" onClick={() => { onApply(pending); setPending(null); }}>Replace</button><button type="button" className="pe-btn pe-btn-ghost" onClick={() => setPending(null)}>Cancel</button></div>
        </div>
      )}
      {shown.length ? (
        <div className="tp-grid">
          {shown.map((template) => (
            <button key={template.id} type="button" className="tp-card" disabled={disabled} onClick={() => choose(template)} aria-label={`Use the ${template.name} template`}>
              <TemplatePreview template={template} ink="#101828" />
              <span>{template.name}</span>
            </button>
          ))}
        </div>
      ) : <p className="el-empty">No templates match “{query}”.</p>}
      <p className="el-count">Templates become normal layers you can change, move, and recolor.</p>
    </div>
  );
}
