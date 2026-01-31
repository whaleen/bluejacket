import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { WarehouseLogo } from "@/components/Brand/WarehouseLogo";
import { ThemeToggle } from "./ThemeToggle";
import supabase from "@/lib/supabase";

export function SignupView() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const [needsEmailConfirm, setNeedsEmailConfirm] = useState(false);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const fullName = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");
    const company = String(form.get("company") ?? "").trim();
    const locations = String(form.get("locations") ?? "").trim();
    const notes = String(form.get("notes") ?? "").trim();

    if (!email || !password) return;
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError(null);

    supabase.auth
      .signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName || null,
            company_name: company || null,
            location_count: locations || null,
            notes: notes || null,
            requested_at: new Date().toISOString(),
          },
        },
      })
      .then(({ data, error: signUpError }) => {
        if (signUpError) {
          setError(signUpError.message);
          return;
        }
        setSubmitted(true);
        setSubmittedEmail(email);
        setNeedsEmailConfirm(!data.session);
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : "Sign up failed.";
        setError(message);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <a href="/" className="flex items-center gap-2 font-medium">
            <WarehouseLogo className="size-6" />
            Warehouse
          </a>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            {submitted ? (
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-2 text-center">
                  <h1 className="text-2xl font-bold">Request received</h1>
                  <p className="text-balance text-sm text-muted-foreground">
                    {needsEmailConfirm
                      ? "Check your email to confirm your request. We will follow up with access details and timing."
                      : "Thanks for reaching out. We will follow up with access details and timing."}
                  </p>
                  {submittedEmail && (
                    <p className="text-xs text-muted-foreground">Submitted for {submittedEmail}</p>
                  )}
                </div>
                <Button asChild variant="outline">
                  <a href="/login">Back to login</a>
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                <div className="flex flex-col gap-2 text-center">
                  <h1 className="text-2xl font-bold">Request access</h1>
                  <p className="text-balance text-sm text-muted-foreground">
                    Join the Warehouse waitlist
                  </p>
                </div>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="name">Full name</FieldLabel>
                    <Input
                      id="name"
                      name="name"
                      placeholder="Alex Johnson"
                      autoComplete="name"
                      required
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="email">Work email</FieldLabel>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="alex@company.com"
                      autoComplete="email"
                      required
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="password">Password</FieldLabel>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="Create a password"
                      autoComplete="new-password"
                      minLength={8}
                      required
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="confirmPassword">Confirm password</FieldLabel>
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      placeholder="Re-enter your password"
                      autoComplete="new-password"
                      minLength={8}
                      required
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="company">Company name</FieldLabel>
                    <Input
                      id="company"
                      name="company"
                      placeholder="Acme Appliances"
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="locations">Number of locations</FieldLabel>
                    <Input
                      id="locations"
                      name="locations"
                      placeholder="3"
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="notes">Additional notes (optional)</FieldLabel>
                    <Input
                      id="notes"
                      name="notes"
                      placeholder="Tell us about your needs"
                    />
                  </Field>

                  {error && (
                    <div className="rounded-lg bg-destructive/15 px-4 py-3 text-sm text-destructive">
                      {error}
                    </div>
                  )}

                  <Field>
                    <Button type="submit" disabled={loading} className="w-full">
                      {loading ? "Requesting..." : "Request access"}
                    </Button>
                    <FieldDescription className="text-center">
                      Already have an account?{" "}
                      <a href="/login" className="underline underline-offset-4">
                        Sign in
                      </a>
                    </FieldDescription>
                  </Field>
                </FieldGroup>
              </form>
            )}
            <div className="mt-4 flex justify-center">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>
      <div className="relative hidden bg-muted lg:block">
        <div className="absolute inset-0 flex items-center justify-center p-10">
          <div className="text-center">
            <WarehouseLogo className="mx-auto size-24 opacity-20" />
          </div>
        </div>
      </div>
    </div>
  );
}
