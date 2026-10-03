import { SkinkArt } from "./skink-art";

/** Sweet'Oh's green tree skink, Lamprolepis smaragdina. Static, server-safe version used across the app (small sizes show just the face). */
export function MascotCharacter({ size = 48, className = "" }: { size?: number; className?: string }) {
  return <SkinkArt size={size} live={false} face={size <= 72} className={className} />;
}
