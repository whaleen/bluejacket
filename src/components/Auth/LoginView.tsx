import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { WarehouseLogo } from "@/components/Brand/WarehouseLogo";
import { ThemeToggle } from "./ThemeToggle";
import { useAuth } from "@/context/AuthContext";

export function LoginView() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await login(email, password);

    if (!result.success) {
      setError(result.error?.message || "Login failed");
      setLoading(false);
    } else {
      window.location.href = "/";
    }
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
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <div className="flex flex-col gap-2 text-center">
                <h1 className="text-2xl font-bold">Welcome back</h1>
                <p className="text-balance text-sm text-muted-foreground">
                  Sign in to your Warehouse account
                </p>
              </div>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="m@example.com"
                    autoComplete="email"
                    required
                  />
                </Field>

                <Field>
                  <div className="flex items-center">
                    <FieldLabel htmlFor="password">Password</FieldLabel>
                    <a
                      href="/reset-password"
                      className="ml-auto text-sm underline-offset-4 hover:underline"
                    >
                      Forgot your password?
                    </a>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
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
                    {loading ? "Signing in..." : "Login"}
                  </Button>
                  <FieldDescription className="text-center">
                    Don&apos;t have an account?{" "}
                    <a href="/signup" className="underline underline-offset-4">
                      Request access
                    </a>
                  </FieldDescription>
                </Field>
              </FieldGroup>
            </form>
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
