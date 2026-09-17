/** Sweet'Oh's green tree skink, Lamprolepis smaragdina. */
export function MascotCharacter({ size = 48, className = "" }: { size?: number; className?: string }) {
  return <svg width={size} height={size} viewBox="0 0 80 80" className={className} role="img" aria-label="Sweet'Oh green tree skink">
    <circle cx="40" cy="40" r="38" fill="#e9f3df" />
    <path d="M43 55 C65 57 72 38 63 28 C79 36 74 67 48 68" fill="#429453" />
    <path d="M26 47 L13 54 M16 48 L13 54 L19 56 M49 48 L59 57 M54 56 L59 57 L60 51" fill="none" stroke="#388648" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    <ellipse cx="37" cy="47" rx="16" ry="22" fill="#66b747" transform="rotate(-15 37 47)" />
    <ellipse cx="35" cy="51" rx="9" ry="14" fill="#cde895" />
    <path d="M19 31 Q17 14 36 14 Q52 13 57 30 Q57 39 40 41 Q24 41 19 31" fill="#79c94f" />
    <ellipse cx="29" cy="25" rx="5" ry="6" fill="#e8f5ce" /><ellipse cx="46" cy="25" rx="5" ry="6" fill="#e8f5ce" />
    <circle cx="30" cy="25" r="3" fill="#193d28" /><circle cx="45" cy="25" r="3" fill="#193d28" />
    <circle cx="31" cy="24" r="1" fill="white" /><circle cx="46" cy="24" r="1" fill="white" />
    <path d="M30 34 Q38 39 47 33" stroke="#285d35" strokeWidth="2" fill="none" strokeLinecap="round" />
    <path d="M30 17 L37 20 L44 17 M28 43 L31 45 M45 44 L48 46" stroke="#97dc6e" strokeWidth="2" fill="none" />
  </svg>;
}
