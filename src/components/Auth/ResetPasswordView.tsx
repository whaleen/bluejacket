import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { AuthLayout } from "./AuthLayout";

export function ResetPasswordView() {
  const { sendPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const result = await sendPasswordReset(email);

    if (result.success) {
      setSuccess(true);
    } else {
      setError(result.error?.message || "Failed to send reset email");
    }

    setLoading(false);
  };

  return (
    <AuthLayout
      title="Reset your password"
      description="We'll send you a recovery email with a link and code"
    >
      {success ? (
        <div className="space-y-5">
          <div className="rounded-lg bg-green-50 border border-green-100 px-4 py-3">
            <p className="text-sm text-green-600">
              Check your email for reset instructions. The email contains a link and a 6-digit code
              you can use to reset your password.
            </p>
          </div>

          <Button
            onClick={() => (window.location.href = `/update-password?email=${encodeURIComponent(email)}`)}
            className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-medium"
          >
            I have a code - reset now
          </Button>

          <Button
            onClick={() => (window.location.href = "/login")}
            variant="outline"
            className="w-full h-11 border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Return to login
          </Button>
        </div>
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
              required
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-medium"
          >
            {loading ? "Sending..." : "Send reset email"}
          </Button>

          <div className="text-center">
            <a
              href="/login"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Back to login
            </a>
          </div>
        </form>
      )}
    </AuthLayout>
  );
}
