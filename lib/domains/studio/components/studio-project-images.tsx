import type { StudioProjectImage } from "../images";

const ROLE_LABELS: Record<StudioProjectImage["role"], string> = {
  reference: "Customer reference",
  production: "Production",
  mockup: "Mockup",
};

type StudioProjectImagesProps = {
  images: StudioProjectImage[];
  title?: string;
};

export function StudioProjectImages({ images, title }: StudioProjectImagesProps) {
  if (images.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      {title ? <h3 className="text-sm font-medium text-neutral-800">{title}</h3> : null}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {images.map((image) => (
          <figure
            key={image.assetId}
            className="overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.previewUrl}
              alt={image.name}
              className="aspect-square w-full object-cover"
            />
            <figcaption className="border-t border-neutral-200 px-2 py-1.5 text-xs text-neutral-600">
              <span className="font-medium text-neutral-800">{ROLE_LABELS[image.role]}</span>
              <span className="mt-0.5 block truncate">{image.name}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
