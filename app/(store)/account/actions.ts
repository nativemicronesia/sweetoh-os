"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentCustomer, signInCustomer, signOutCustomer, signUpCustomer } from "@/lib/domains/customers/account";
import { createCustomRequest, CUSTOM_REQUEST_MAX_PHOTOS } from "@/lib/domains/customers/custom-requests";
import { getActionErrorMessage } from "@/lib/shared/action-errors";

export type FormState = { error?: string; values?: Record<string, string> } | undefined;

/** Only same-site paths, so a shared link can't bounce people elsewhere. */
function safeNext(raw: FormDataEntryValue | null, fallback = "/custom") {
  const next = String(raw ?? "");
  return next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/partner") ? next : fallback;
}

const signUpSchema = z.object({
  name: z.string().trim().min(1, "Tell us your name.").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
  password: z.string().min(8, "Use at least 8 characters for your password.").max(128),
  phone: z.string().trim().max(40).optional(),
});

export async function customerSignUpAction(_prev: FormState, form: FormData): Promise<FormState> {
  const values = { name: String(form.get("name") ?? ""), email: String(form.get("email") ?? ""), phone: String(form.get("phone") ?? "") };
  const parsed = signUpSchema.safeParse({ ...values, password: form.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check your details.", values };
  try {
    await signUpCustomer(parsed.data);
  } catch (error) {
    return { error: getActionErrorMessage(error), values };
  }
  redirect(`${safeNext(form.get("next"))}${safeNext(form.get("next")).includes("?") ? "&" : "?"}welcome=1`);
}

export async function customerSignInAction(_prev: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "");
  try {
    await signInCustomer(email, String(form.get("password") ?? ""));
  } catch (error) {
    return { error: getActionErrorMessage(error), values: { email } };
  }
  redirect(safeNext(form.get("next")));
}

export async function customerSignOutAction() {
  await signOutCustomer();
  redirect("/");
}

export async function submitCustomRequestAction(_prev: FormState, form: FormData): Promise<FormState> {
  const shopper = await getCurrentCustomer();
  if (!shopper) redirect("/account?next=/custom");
  const values = {
    productType: String(form.get("productType") ?? ""),
    description: String(form.get("description") ?? ""),
    quantity: String(form.get("quantity") ?? "1"),
    neededBy: String(form.get("neededBy") ?? ""),
    budget: String(form.get("budget") ?? ""),
    phone: String(form.get("phone") ?? ""),
  };
  const photos = form
    .getAll("photos")
    .filter((f): f is File => f instanceof File && f.size > 0)
    .slice(0, CUSTOM_REQUEST_MAX_PHOTOS);
  const neededBy = /^\d{4}-\d{2}-\d{2}$/.test(values.neededBy) ? values.neededBy : null;
  try {
    await createCustomRequest(shopper, {
      productType: values.productType,
      description: values.description,
      quantity: Number.parseInt(values.quantity, 10) || 0,
      neededBy,
      budget: values.budget || null,
      phone: values.phone || shopper.phone || null,
      photos: await Promise.all(photos.map(async (f) => ({ file: Buffer.from(await f.arrayBuffer()), filename: f.name }))),
    });
  } catch (error) {
    return { error: getActionErrorMessage(error), values };
  }
  revalidatePath("/custom");
  revalidatePath("/partner/custom-requests");
  redirect("/custom?sent=1");
}
