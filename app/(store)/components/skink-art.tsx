import { useId } from "react";
import "./skink.css";

export type SkinkMood = "idle" | "listening" | "thinking" | "speaking" | "happy";

/**
 * Skink, Sweet'Oh's green tree skink (Lamprolepis smaragdina), drawn as layered parts so each can move:
 * body breathes, tail sways, head bobs, eyelids blink, pupils follow, mouth talks. Pure SVG + CSS, no JS,
 * so it is safe to render on the server. `live` turns the idle animation on.
 */
export function SkinkArt({ size = 160, mood = "idle", live = true, perch = false, face = false, className = "", title = "Skink, the Sweet'Oh guide" }: { size?: number; mood?: SkinkMood; live?: boolean; perch?: boolean; face?: boolean; className?: string; title?: string }) {
  const u = useId().replace(/[^a-zA-Z0-9]/g, "");
  const head = `h${u}`, body = `b${u}`, belly = `l${u}`, iris = `i${u}`, rim = `r${u}`;
  return (
    <svg className={`sk ${className}`} width={size} height={face ? size * 0.92 : size * 1.08} viewBox={face ? "34 24 144 132" : "0 0 240 260"} role="img" aria-label={title} data-mood={mood} data-live={live ? "true" : "false"}>
      <defs>
        <linearGradient id={head} gradientUnits="userSpaceOnUse" x1="70" y1="40" x2="150" y2="145">
          <stop offset="0" stopColor="#8fe05c" /><stop offset=".55" stopColor="#4fbf5a" /><stop offset="1" stopColor="#2f9a56" />
        </linearGradient>
        <linearGradient id={body} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5acb5b" /><stop offset="1" stopColor="#23874f" />
        </linearGradient>
        <radialGradient id={belly} cx=".5" cy=".4" r=".7"><stop offset="0" stopColor="#f0f9b5" /><stop offset="1" stopColor="#bfe48a" /></radialGradient>
        <radialGradient id={iris} cx=".4" cy=".35" r=".8"><stop offset="0" stopColor="#ffe27a" /><stop offset="1" stopColor="#e0a21b" /></radialGradient>
        <linearGradient id={rim} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".7" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
      </defs>

      {perch && (
        <g>
          <path d="M6 222 Q60 212 120 218 T236 214" fill="none" stroke="#5b3d25" strokeWidth="15" strokeLinecap="round" />
          <path d="M10 219 Q62 209 120 215 T232 211" fill="none" stroke="#8a6140" strokeWidth="5" strokeLinecap="round" opacity=".6" />
          <path d="M200 212 q16 -26 40 -22 q-6 24 -40 22z" fill="#2f9a56" /><path d="M200 212 q16 -16 36 -20" stroke="#1d6b3b" strokeWidth="1.5" fill="none" />
        </g>
      )}
      <ellipse cx="116" cy="226" rx="62" ry="7" fill="#16120d" opacity=".16" />

      {/* tail: tapered by stacking strokes */}
      <g className="sk-tail">
        <path d="M150 190 C178 190 206 200 214 222" fill="none" stroke="#2f9a56" strokeWidth="26" strokeLinecap="round" />
        <path d="M214 222 C219 238 204 252 188 248" fill="none" stroke="#2f9a56" strokeWidth="17" strokeLinecap="round" />
        <path d="M188 248 C176 245 172 232 182 227" fill="none" stroke="#2f9a56" strokeWidth="9" strokeLinecap="round" />
        <path d="M152 184 C180 184 206 193 214 212" fill="none" stroke="#7fd65f" strokeWidth="6" strokeLinecap="round" opacity=".55" />
      </g>

      <g className="sk-body">
        {/* hind leg */}
        <path d="M138 200 C150 198 160 206 158 216 L164 224 M158 216 L152 226 M158 216 L168 218" fill="none" stroke="#2a8b4f" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
        <ellipse cx="116" cy="178" rx="62" ry="44" fill={`url(#${body})`} transform="rotate(-6 116 178)" />
        <ellipse cx="108" cy="192" rx="38" ry="26" fill={`url(#${belly})`} transform="rotate(-6 108 192)" />
        <path d="M70 168 Q112 148 158 168" fill="none" stroke="#9de66b" strokeWidth="5" strokeLinecap="round" opacity=".5" />
        {/* front limbs */}
        <path d="M78 204 C70 208 66 216 70 224 L62 228 M70 224 L70 232 M70 224 L78 230" fill="none" stroke="#2a8b4f" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M126 206 C130 212 130 220 126 226 L120 230 M126 226 L128 232 M126 226 L134 230" fill="none" stroke="#33a059" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
        {/* bandana */}
        <path d="M64 142 Q108 166 152 142 L134 184 Q108 198 84 184 Z" fill="#d93d22" />
        <path d="M64 142 Q108 166 152 142" fill="none" stroke="#b32f17" strokeWidth="3" />
        <g fill="#fff6e4"><circle cx="90" cy="162" r="2.3" /><circle cx="108" cy="172" r="2.3" /><circle cx="126" cy="162" r="2.3" /><circle cx="100" cy="180" r="1.8" /><circle cx="118" cy="180" r="1.8" /></g>
      </g>

      <g className="sk-head">
        <path d="M50 98 C50 58 78 38 108 38 C140 38 166 60 166 96 C166 128 138 146 108 146 C76 146 50 130 50 98 Z" fill={`url(#${head})`} />
        <path d="M60 78 C64 56 84 44 106 43" fill="none" stroke={`url(#${rim})`} strokeWidth="4" strokeLinecap="round" />
        <path d="M92 44 Q108 56 124 44" fill="none" stroke="#2f9a56" strokeWidth="3" strokeLinecap="round" opacity=".6" />
        <ellipse cx="108" cy="134" rx="30" ry="11" fill="#d3ee9c" opacity=".85" />
        <circle cx="67" cy="112" r="9" fill="#ff7a5a" opacity=".35" /><circle cx="149" cy="112" r="9" fill="#ff7a5a" opacity=".35" />

        {/* brows */}
        <path className="sk-brow" d="M63 70 Q80 58 98 68" fill="none" stroke="#237a45" strokeWidth="4" strokeLinecap="round" />
        <path className="sk-brow" d="M118 68 Q136 58 153 70" fill="none" stroke="#237a45" strokeWidth="4" strokeLinecap="round" />
        {/* eyes */}
        {[82, 134].map((cx) => (
          <g key={cx}>
            <ellipse cx={cx} cy="90" rx="19" ry="21" fill="#f3fad2" stroke="#237a45" strokeWidth="2" />
            <g className="sk-pupil">
              <ellipse cx={cx} cy="92" rx="12.5" ry="14.5" fill={`url(#${iris})`} />
              <ellipse cx={cx} cy="93" rx="7" ry="10" fill="#14281d" />
              <circle cx={cx - 4} cy="86" r="4.2" fill="#fff" /><circle cx={cx + 4} cy="99" r="2" fill="#fff" opacity=".85" />
            </g>
            <ellipse className="sk-lid" cx={cx} cy="90" rx="19.5" ry="21.5" fill={`url(#${head})`} stroke="#237a45" strokeWidth="2" />
          </g>
        ))}
        <circle cx="100" cy="116" r="1.8" fill="#237a45" /><circle cx="116" cy="116" r="1.8" fill="#237a45" />
        {/* mouth */}
        <path className="sk-mouth-closed" d="M78 124 Q108 142 138 124" fill="none" stroke="#1f5e38" strokeWidth="3.4" strokeLinecap="round" />
        <g className="sk-mouth-open">
          <path d="M82 124 Q108 130 134 124 Q130 148 108 148 Q86 148 82 124 Z" fill="#3a1a1f" />
          <path d="M92 142 Q108 134 124 142 Q116 149 108 149 Q100 149 92 142Z" fill="#ff8aa0" />
        </g>
        <g className="sk-tongue"><path d="M108 128 L108 150 M108 150 L103 156 M108 150 L113 156" stroke="#ff7a96" strokeWidth="3" strokeLinecap="round" fill="none" /></g>
        {/* thinking sparks */}
        <g className="sk-sparkle" fill="#f0c419"><path d="M178 52 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3z" /></g>
        <g className="sk-sparkle" fill="#fff6e4"><path d="M196 82 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" /></g>
        <g className="sk-sparkle" fill="#d93d22"><path d="M170 24 l2 4.5 4.5 2 -4.5 2 -2 4.5 -2 -4.5 -4.5 -2 4.5 -2z" /></g>
      </g>
    </svg>
  );
}
