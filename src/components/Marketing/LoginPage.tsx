import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { ArrowLeft } from "lucide-react";
import { COLORS } from "./MarketingLayout";
import { WarehouseLogo } from "@/components/Brand/WarehouseLogo";
import supabase from "@/lib/supabase";

export function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetNotice, setResetNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [codeMode, setCodeMode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);

  const withTimeout = async <T,>(promise: Promise<T>, ms: number, message: string) => {
    let timeoutId: number | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = window.setTimeout(() => {
        reject(new Error(message));
      }, ms);
    });
    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      if (timeoutId) window.clearTimeout(timeoutId);
    }
  };

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash) return;
    const params = new URLSearchParams(hash);
    const type = params.get("type");
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    if (type === "recovery" && accessToken && refreshToken) {
      supabase.auth
        .setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ error: sessionError }) => {
          if (sessionError) {
            setResetError(sessionError.message);
            return;
          }
          setRecoveryMode(true);
          setResetNotice("Set a new password to finish resetting your account.");
          window.history.replaceState({}, "", window.location.pathname);
        })
        .catch((err) => {
          const message = err instanceof Error ? err.message : "Unable to start password reset.";
          setResetError(message);
        });
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const ok = await login(email, password);
    if (!ok) setError("Invalid email or password");

    setLoading(false);
  };

  const handleSendCode = async () => {
    if (!email) {
      setResetError("Enter your email to receive a reset code.");
      return;
    }
    setResetLoading(true);
    setResetError(null);
    setResetNotice(null);

    try {
      const result = await withTimeout(
        supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/login`,
        }),
        12000,
        "Reset request timed out. Please try again."
      );

      if (result.error) {
        setResetError(result.error.message);
      } else {
        setResetNotice("We emailed you a 6-digit code. Enter it below to reset.");
        setCodeSent(true);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send reset code.";
      setResetError(message);
    } finally {
      setResetLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPassword || resetPassword !== resetPasswordConfirm) {
      setResetError("Passwords do not match.");
      return;
    }
    if (!email || !resetCode) {
      setResetError("Enter the email and code from the reset email.");
      return;
    }
    setResetLoading(true);
    setResetError(null);
    try {
      const verifyResult = await withTimeout(
        supabase.auth.verifyOtp({
          email,
          token: resetCode,
          type: "recovery",
        }),
        12000,
        "Verification timed out. Please try again."
      );
      const verifyError = verifyResult.error;
      if (verifyError) {
        setResetError(verifyError.message);
        return;
      }
      if (verifyResult.data?.session) {
        await supabase.auth.setSession({
          access_token: verifyResult.data.session.access_token,
          refresh_token: verifyResult.data.session.refresh_token,
        });
      }
      const updateResult = await withTimeout(
        supabase.auth.updateUser({ password: resetPassword }),
        12000,
        "Password update timed out. Please try again."
      );
      const updateError = updateResult.error;
      if (updateError) {
        setResetError(updateError.message);
      } else {
        setResetComplete(true);
        setResetNotice("Password updated. You can sign in now.");
        setRecoveryMode(false);
        setCodeMode(false);
        setCodeSent(false);
        setResetCode("");
        setResetPassword("");
        setResetPasswordConfirm("");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to reset password.";
      setResetError(message);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen marketing-root"
      style={{
        background: `linear-gradient(to bottom right, ${COLORS.blue}10, white, ${COLORS.blueViolet}10)`,
      }}
    >
      {/* Simple header */}
      <header className="border-b border-gray-100 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <a href="/" className="flex items-center gap-2.5">
              <WarehouseLogo className="h-9 w-9 text-gray-900" aria-hidden="true" />
              <span className="text-xl font-bold text-gray-900">Warehouse</span>
            </a>

            <a
              href="/"
              className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to home
            </a>
          </div>
        </div>
      </header>

      {/* Login form */}
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div
            className="rounded-2xl border border-gray-100 bg-white p-8 shadow-xl"
            style={{ boxShadow: `0 25px 50px -12px ${COLORS.blue}15` }}
          >
            <div className="text-center mb-8">
              <WarehouseLogo className="h-14 w-14 text-gray-900 mx-auto mb-4" title="Warehouse" />
              <h1 className="text-2xl font-bold text-gray-900">
                {recoveryMode ? "Reset your password" : "Welcome back"}
              </h1>
              <p className="mt-2 text-sm text-gray-500">
                {recoveryMode ? "Create a new password to finish reset." : "Sign in to your Warehouse account"}
              </p>
            </div>

            {recoveryMode || codeMode ? (
              <form
                onSubmit={(event) => {
                  if (codeMode && !codeSent) {
                    event.preventDefault();
                    handleSendCode();
                    return;
                  }
                  handlePasswordReset(event);
                }}
                className="space-y-5"
              >
                {!recoveryMode && (
                  <div className="space-y-2">
                    <Label htmlFor="reset-email" className="text-gray-700">
                      Email
                    </Label>
                    <Input
                      id="reset-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                      autoComplete="email"
                    />
                  </div>
                )}

                {codeMode && (
                  <div className="space-y-2">
                    <Label htmlFor="reset-code" className="text-gray-700">
                      Reset code
                    </Label>
                    <Input
                      id="reset-code"
                      value={resetCode}
                      onChange={(e) => setResetCode(e.target.value)}
                      placeholder="Enter the 6-digit code"
                      className="h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                      inputMode="numeric"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="reset-password" className="text-gray-700">
                    New password
                  </Label>
                  <Input
                    id="reset-password"
                    type="password"
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    placeholder="Enter a new password"
                    className="h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                    autoComplete="new-password"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reset-password-confirm" className="text-gray-700">
                    Confirm password
                  </Label>
                  <Input
                    id="reset-password-confirm"
                    type="password"
                    value={resetPasswordConfirm}
                    onChange={(e) => setResetPasswordConfirm(e.target.value)}
                    placeholder="Re-enter your new password"
                    className="h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                    autoComplete="new-password"
                  />
                </div>

                {resetError && (
                  <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3">
                    <p className="text-sm text-red-600">{resetError}</p>
                  </div>
                )}
                {resetNotice && !resetError && (
                  <div className="rounded-lg bg-green-50 border border-green-100 px-4 py-3">
                    <p className="text-sm text-green-600">{resetNotice}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={
                    resetLoading ||
                    (codeMode && !codeSent && !email) ||
                    (codeMode && codeSent && (!resetCode || !resetPassword || !resetPasswordConfirm)) ||
                    (!codeMode && (!resetPassword || !resetPasswordConfirm))
                  }
                  className="w-full h-11 text-white shadow-lg hover:opacity-90"
                  style={{
                    background: `linear-gradient(to right, ${COLORS.blue}, ${COLORS.blueViolet})`,
                    boxShadow: `0 10px 15px -3px ${COLORS.blue}40`,
                  }}
                >
                  {resetLoading
                    ? "Updating..."
                    : codeMode && !codeSent
                    ? "Send reset code"
                    : "Update password"}
                </Button>
                {!recoveryMode && (
                  <button
                    type="button"
                    className="text-sm font-medium text-gray-500 hover:text-gray-700"
                    onClick={() => {
                      setCodeMode(false);
                      setCodeSent(false);
                      setResetCode("");
                      setResetPassword("");
                      setResetPasswordConfirm("");
                      setResetNotice(null);
                      setResetError(null);
                    }}
                  >
                    Back to sign in
                  </button>
                )}
              </form>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-700">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                    autoComplete="email"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-700">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                    autoComplete="current-password"
                  />
                </div>

                {error && (
                  <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}
                {resetNotice && !error && (
                  <div className="rounded-lg bg-green-50 border border-green-100 px-4 py-3">
                    <p className="text-sm text-green-600">{resetNotice}</p>
                  </div>
                )}
                {resetError && !error && (
                  <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3">
                    <p className="text-sm text-red-600">{resetError}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading || !email || !password}
                  className="w-full h-11 text-white shadow-lg hover:opacity-90"
                  style={{
                    background: `linear-gradient(to right, ${COLORS.blue}, ${COLORS.blueViolet})`,
                    boxShadow: `0 10px 15px -3px ${COLORS.blue}40`,
                  }}
                >
                  {loading ? "Signing in..." : "Sign in"}
                </Button>
              </form>
            )}

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                Don't have an account?{" "}
                <a
                  href="/signup"
                  className="font-medium hover:opacity-80"
                  style={{ color: COLORS.blue }}
                >
                  Request access
                </a>
              </p>
              {!recoveryMode && (
                <div className="mt-3 flex flex-col gap-2">
                  <button
                    type="button"
                    className="text-sm font-medium hover:opacity-80"
                    style={{ color: COLORS.blue }}
                    onClick={() => {
                      setCodeMode(true);
                      setResetNotice(null);
                      setResetError(null);
                    }}
                  >
                    Reset with code
                  </button>
                  <span className="text-xs text-gray-400">
                    We’ll email you a short code instead of a link.
                  </span>
                </div>
              )}
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-gray-400">
            {resetComplete
              ? "Password updated. You can sign in now."
              : "Pre-beta access is invite only. Contact your administrator for credentials."}
          </p>
        </div>
      </div>
    </div>
  );
}
