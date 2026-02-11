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
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    if (!email || !password) return;

    setLoading(true);
    setError(null);

    supabase.auth
      .signUp({
        email,
        password,
        options: {
          data: {
            username: name || null,
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
                      ? "Check your email to confirm your account, then you can sign in."
                      : "Your account is ready. You can sign in now."}
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
                  <h1 className="text-2xl font-bold">Create your account</h1>
                  <p className="text-balance text-sm text-muted-foreground">
                    Sign up to access Warehouse
                  </p>
                </div>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="name">Name</FieldLabel>
                    <Input
                      id="name"
                      name="name"
                      placeholder="Alex Johnson"
                      autoComplete="name"
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="email">Email</FieldLabel>
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

                  {error && (
                    <div className="rounded-lg bg-destructive/15 px-4 py-3 text-sm text-destructive">
                      {error}
                    </div>
                  )}

                  <Field>
                    <Button type="submit" disabled={loading} className="w-full">
                      {loading ? "Creating account..." : "Create account"}
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
