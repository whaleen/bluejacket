import { useState } from "react";
import { MarketingLayout, COLORS } from "./MarketingLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, ArrowRight, Mail } from "lucide-react";
import supabase from "@/lib/supabase";

export function SignupPage() {
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
    <MarketingLayout>
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to bottom right, ${COLORS.blue}12, white, ${COLORS.green}10)`,
          }}
        />
        <div className="absolute inset-0 marketing-grid opacity-50 pointer-events-none" />

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-20 sm:py-24">
          <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] items-start">
            <div className="space-y-6">
              <Badge
                variant="secondary"
                className="border-0 w-fit marketing-fade-up"
                style={{
                  backgroundColor: `${COLORS.blue}20`,
                  color: COLORS.blue,
                  ['--marketing-delay' as string]: "60ms",
                }}
              >
                Request Access
              </Badge>

              <h1
                className="text-4xl sm:text-5xl font-bold text-gray-900 marketing-fade-up"
                style={{ ['--marketing-delay' as string]: "110ms" }}
              >
                Join the Warehouse waitlist
              </h1>

              <p
                className="text-lg text-gray-600 max-w-xl marketing-fade-up"
                style={{ ['--marketing-delay' as string]: "160ms" }}
              >
                We’re onboarding teams in waves. Submit your details and we’ll reach out
                with next steps, timelines, and product updates.
              </p>

              <div className="space-y-3 text-sm text-gray-600">
                {[
                  "No account is created yet — this is a request for access.",
                  "We review requests weekly and follow up with onboarding details.",
                  "You’ll get early product updates and launch timing.",
                ].map((item, index) => (
                  <div
                    key={item}
                    className="flex items-start gap-2 marketing-fade-up"
                    style={{ ['--marketing-delay' as string]: `${210 + index * 70}ms` }}
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4" style={{ color: COLORS.green }} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Mail className="h-4 w-4" />
                Prefer to reach us directly? Email hello@warehouse.app
              </div>
            </div>

            <div className="relative">
              <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full blur-3xl" style={{ backgroundColor: `${COLORS.blue}30` }} />
              <div className="absolute -bottom-10 left-6 h-28 w-28 rounded-full blur-3xl" style={{ backgroundColor: `${COLORS.green}25` }} />

              <div
                className="relative rounded-3xl border border-gray-100 bg-white p-8 shadow-2xl marketing-fade-up"
                style={{ ['--marketing-delay' as string]: "120ms" }}
              >
                {submitted ? (
                  <div className="text-center space-y-4">
                    <div
                      className="mx-auto flex h-12 w-12 items-center justify-center rounded-full"
                      style={{ backgroundColor: `${COLORS.green}20`, color: COLORS.green }}
                    >
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <h2 className="text-2xl font-semibold text-gray-900">Request received</h2>
                    <p className="text-sm text-gray-600">
                      {needsEmailConfirm
                        ? "Check your email to confirm your request. We’ll follow up with access details and timing."
                        : "Thanks for reaching out. We’ll follow up with access details and timing."}
                    </p>
                    {submittedEmail && (
                      <p className="text-xs text-gray-500">Submitted for {submittedEmail}</p>
                    )}
                    <a href="/features">
                      <Button variant="outline">Explore features</Button>
                    </a>
                  </div>
                ) : (
                  <form className="space-y-5" onSubmit={handleSubmit}>
                    <div>
                      <h2 className="text-2xl font-semibold text-gray-900">Request early access</h2>
                      <p className="text-sm text-gray-500 mt-2">
                        Share a few details and we’ll reach out soon.
                      </p>
                    </div>

                    {error && (
                      <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">
                        {error}
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="waitlist-name">Full name</Label>
                      <Input
                        id="waitlist-name"
                        name="name"
                        placeholder="Alex Johnson"
                        autoComplete="name"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="waitlist-email">Work email</Label>
                      <Input
                        id="waitlist-email"
                        name="email"
                        type="email"
                        placeholder="alex@company.com"
                        autoComplete="email"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="waitlist-password">Password</Label>
                      <Input
                        id="waitlist-password"
                        name="password"
                        type="password"
                        placeholder="Create a password"
                        autoComplete="new-password"
                        minLength={8}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="waitlist-password-confirm">Confirm password</Label>
                      <Input
                        id="waitlist-password-confirm"
                        name="confirmPassword"
                        type="password"
                        placeholder="Re-enter your password"
                        autoComplete="new-password"
                        minLength={8}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="waitlist-company">Company</Label>
                      <Input id="waitlist-company" name="company" placeholder="Northwest Appliances" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="waitlist-locations">Number of locations</Label>
                      <Input id="waitlist-locations" name="locations" placeholder="e.g. 3" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="waitlist-notes">Anything we should know?</Label>
                      <textarea
                        id="waitlist-notes"
                        name="notes"
                        rows={3}
                        className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                        placeholder="Tell us about your workflow or timeline."
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full text-white shadow-lg hover:opacity-90"
                      disabled={loading}
                      style={{
                        background: `linear-gradient(to right, ${COLORS.blue}, ${COLORS.blueViolet})`,
                        boxShadow: `0 10px 15px -3px ${COLORS.blue}40`,
                      }}
                    >
                      {loading ? "Submitting…" : "Join waitlist"}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                    <p className="text-xs text-gray-500 text-center">
                      This creates a pending account. We’ll review your request and follow up.
                    </p>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
