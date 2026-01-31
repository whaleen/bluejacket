import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { AppAuthLayout } from "./AppAuthLayout";
import supabase from "@/lib/supabase";

export function UpdatePasswordView() {
  const { verifyOtpAndUpdatePassword, setPasswordFromRecovery } = useAuth();
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [emailPreFilled, setEmailPreFilled] = useState(false);

  useEffect(() => {
    // Check if email is in query params (from reset password page)
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get("email");
    if (emailParam) {
      setEmail(emailParam);
      setEmailPreFilled(true);
    }

    // Check if we have a recovery token in the URL hash
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash) return;

    const hashParams = new URLSearchParams(hash);
    const type = hashParams.get("type");
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");

    if (type === "recovery" && accessToken && refreshToken) {
      supabase.auth
        .setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ error: sessionError }) => {
          if (sessionError) {
            setError(sessionError.message);
            return;
          }
          setIsRecoveryMode(true);
          // Clear the hash from the URL
          window.history.replaceState({}, "", window.location.pathname);
        })
        .catch((err) => {
          const message = err instanceof Error ? err.message : "Unable to start password reset.";
          setError(message);
        });
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate password confirmation
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    // Validate password length
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    try {
      let result;

      if (isRecoveryMode) {
        // Recovery link flow - session already set
        result = await setPasswordFromRecovery(newPassword);
      } else {
        // OTP code flow - need to verify code first
        if (!email || !otpCode) {
          setError("Please enter your email and the 6-digit code from your email");
          setLoading(false);
          return;
        }
        result = await verifyOtpAndUpdatePassword(email, otpCode, newPassword);
      }

      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.error?.message || "Failed to update password");
      }
    } catch (err) {
      console.error('Error in handleSubmit:', err);
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppAuthLayout
      title="Set new password"
      description={
        isRecoveryMode
          ? "Create a new password to finish reset"
          : "Enter the code from your email and set a new password"
      }
    >
      {success ? (
        <div className="space-y-5">
          <div className="rounded-lg bg-green-50 border border-green-100 px-4 py-3">
            <p className="text-sm text-green-600">
              Password updated successfully! You can now sign in with your new password.
            </p>
          </div>

          <Button
            onClick={() => (window.location.href = "/login")}
            className="w-full"
          >
            Return to login
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {!isRecoveryMode && (
            <>
              <div className="space-y-2">
                <Label htmlFor="email" >
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className=""
                  autoComplete="email"
                  readOnly={emailPreFilled}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="otp-code" >
                  Reset code
                </Label>
                <Input
                  id="otp-code"
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="Enter the 6-digit code"
                  className=""
                  inputMode="numeric"
                  maxLength={6}
                  required
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="new-password" >
              New password
            </Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter a new password"
              className=""
              autoComplete="new-password"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password" >
              Confirm password
            </Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your new password"
              className=""
              autoComplete="new-password"
              required
            />
          </div>

          {error && (
            <div className="rounded-lg bg-destructive/15 px-4 py-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full"
          >
            {loading ? "Updating password..." : "Update password"}
          </Button>

          <div className="text-center">
            <a
              href="/login"
              className="text-muted-foreground"
            >
              Back to login
            </a>
          </div>
        </form>
      )}
    </AppAuthLayout>
  );
}
