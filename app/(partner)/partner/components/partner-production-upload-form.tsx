type PartnerProductionUploadFormProps = {
  action: (formData: FormData) => Promise<void>;
};

export function PartnerProductionUploadForm({
  action,
}: PartnerProductionUploadFormProps) {
  return (
    <form
      action={action}
      className="mt-4 flex flex-wrap items-end gap-3 rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-4"
    >
      <label className="block flex-1 text-sm">
        <span className="mb-1 block font-medium text-neutral-800">
          Upload product image
        </span>
        <input
          name="file"
          type="file"
          required
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="w-full text-sm text-neutral-700 file:mr-3 file:rounded file:border-0 file:bg-white file:px-3 file:py-2 file:text-sm file:font-medium file:text-emerald-900"
        />
        <span className="mt-1 block text-xs text-neutral-500">
          JPEG, PNG, WebP, or GIF — max 10 MB
        </span>
      </label>
      <button
        type="submit"
        className="rounded bg-emerald-800 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-900"
      >
        Upload
      </button>
    </form>
  );
}
