import { Button } from "@/components/ui/button"

type PendingAccessProps = {
  email?: string | null
  onLogout: () => void
}

export function PendingAccess({ email, onLogout }: PendingAccessProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="max-w-md w-full rounded-2xl border border-border bg-card p-8 shadow-lg text-center space-y-4">
        <div className="text-sm uppercase tracking-widest text-muted-foreground">
          Pending Access
        </div>
        <h1 className="text-2xl font-semibold text-foreground">
          Your account is awaiting approval
        </h1>
        <p className="text-sm text-muted-foreground">
          {email ? (
            <>
              We created your account for <span className="font-medium">{email}</span>.
              An administrator needs to approve access before you can use the app.
            </>
          ) : (
            "An administrator needs to approve access before you can use the app."
          )}
        </p>
        <Button variant="outline" className="w-full" onClick={onLogout}>
          Log out
        </Button>
      </div>
    </div>
  )
}
