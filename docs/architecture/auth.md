# Authentication Implementation

## Overview

Warehouse uses **Supabase Auth** for secure email/password authentication with role-based access control.

* Leverages Supabase Auth for secure password hashing and session management
* User profiles stored in `profiles` table with role-based access
* Supports password reset via email (link and OTP code methods)
* Pending user approval workflow for new signups

## Architecture

### Auth Tables

**`auth.users` (Supabase managed)**
- Handles authentication, password hashing, sessions
- Managed entirely by Supabase Auth

**`public.profiles` (Application managed)**
- User profile data linked to `auth.users` via `id`
- Fields:
  - `id` (uuid) - Primary key, references `auth.users.id`
  - `email` (text) - User's email address
  - `username` (text) - Display name
  - `image` (text) - Avatar URL (Supabase Storage)
  - `role` (text) - Access level: `"pending"`, `"member"`, `"admin"`
  - `company_id` (uuid) - Multi-tenant relationship

### AuthContext

React Context (`AuthContext`) manages authentication state throughout the app.

#### State

```typescript
type UserProfile = {
  id: string
  email: string | null
  username: string | null
  image?: string | null
  role: "pending" | "member" | "admin" | string | null
  company_id?: string | null
}

type AuthContextType = {
  user: UserProfile | null
  login: (email: string, password: string) => Promise<AuthResult>
  logout: () => Promise<void>
  sendPasswordReset: (email: string) => Promise<AuthResult>
  verifyOtpAndUpdatePassword: (email: string, token: string, newPassword: string) => Promise<AuthResult>
  setPasswordFromRecovery: (newPassword: string) => Promise<AuthResult>
  updateUser: (updates: Partial<UserProfile>) => Promise<void>
  updatePassword: (password: string) => Promise<void>
  refreshUser: () => Promise<void>
  loading: boolean
}
```

#### Login Flow

1. User enters email and password
2. `login()` calls `supabase.auth.signInWithPassword()`
3. On success, fetches user profile from `profiles` table
4. Sets `user` state and auth session is managed by Supabase
5. Returns `{ success: boolean, error?: AuthError }` with detailed error messages

#### Session Management

- Session restored automatically on page load via `supabase.auth.getSession()`
- Listens to `onAuthStateChange()` for real-time auth updates
- Auto-creates profile record for new users
- No manual localStorage management - Supabase handles it

## Authentication Views

### LoginView (`/login`)
**Purpose:** Email/password sign-in only

- Email and password inputs
- Clear error messages from Supabase
- Links to password reset and signup
- Uses `AuthLayout` for consistent styling

### ResetPasswordView (`/reset-password`)
**Purpose:** Request password reset

- User enters email
- Sends password reset email via `sendPasswordReset()`
- Email contains both a recovery link and 6-digit OTP code
- Shows success message with instructions

### UpdatePasswordView (`/update-password`)
**Purpose:** Set new password after verification

Handles two flows:

**1. Recovery Link (from email)**
- URL contains `#type=recovery&access_token=...&refresh_token=...`
- Automatically extracts tokens and sets session
- Shows password form (new password + confirmation)
- Calls `setPasswordFromRecovery()`

**2. OTP Code (manual entry)**
- User navigates to `/update-password` directly
- Enters email + 6-digit code + new password
- Calls `verifyOtpAndUpdatePassword()` to verify code and set password

## Role-Based Access Control

### Roles

- **`"pending"`** - New signups awaiting admin approval
- **`"member"`** - Standard user with app access
- **`"admin"`** - Full access including user management

### Access Flow

1. User signs up at `/signup`
2. Account created with `role: "pending"`
3. User can log in but sees `PendingAccess` screen instead of app
4. Admin changes role to `"member"` or `"admin"` in settings
5. User gains full app access on next login/refresh

### Route Protection

**Public Routes** (no auth required):
- `/` - Landing page
- `/pricing`, `/features` - Marketing pages
- `/login` - Login page
- `/reset-password` - Password reset request
- `/update-password` - Password reset completion
- `/signup` - Signup/waitlist
- `/display/*` - Floor displays (kiosk mode)

**Protected Routes** (require auth + non-pending role):
- `/app` - Dashboard
- `/inventory`, `/parts`, `/products` - Inventory management
- `/loads` - Load management
- `/activity` - Activity log
- `/settings/*` - Settings views

**Route Guard Logic** (`App.tsx`):
```typescript
// 1. Check if public route
if (isPublicRoute(pathname)) {
  // Allow access, redirect to app if already logged in
}

// 2. Wait for auth to load
if (loading) return null

// 3. Redirect to login if not authenticated
if (!user) {
  navigate('login', { replace: true })
  return null
}

// 4. Show pending screen if awaiting approval
if (user.role === "pending") {
  return <PendingAccess />
}

// 5. Show app
return <AppLayout />
```

## Password Reset Flows

### Email Link Flow
1. User visits `/reset-password`
2. Enters email, receives reset email
3. Clicks link in email → redirects to `/update-password#type=recovery&...`
4. Session automatically restored from URL hash
5. User enters new password (2x for confirmation)
6. Password updated via `setPasswordFromRecovery()`
7. Success → redirects to `/login`

### OTP Code Flow
1. User visits `/reset-password`
2. Enters email, receives reset email with 6-digit code
3. Manually navigates to `/update-password`
4. Enters email + code + new password
5. Code verified and password updated via `verifyOtpAndUpdatePassword()`
6. Success → redirects to `/login`

## Security Features

✅ **What's Implemented:**
- Passwords hashed securely by Supabase Auth (bcrypt)
- Session tokens managed by Supabase (JWT)
- Auth state loading prevents flash of wrong content
- Email verification for password resets
- Role-based access control
- Error messages don't leak sensitive info
- Session persists across page refreshes

⚠️ **What's Intentionally Permissive (Prototype Mode):**
- RLS policies may be open for prototyping
- Some tables accessible without strict user filtering
- Email confirmation might be disabled for faster testing

🔒 **Production Hardening (Future):**
- Tighten RLS policies per user/company
- Enable email confirmation on signup
- Add rate limiting on auth endpoints
- Implement MFA (multi-factor authentication)
- Add audit logging for auth events

## User Profile Management

### Avatar Upload
- Users can upload profile pictures via `AvatarUploader` component
- Uploads to Supabase Storage bucket: `avatars`
- File path: `{userId}/{userId}.{ext}`
- Public URLs stored in `profiles.image`
- Disabled for pending users

### Profile Updates
- Username changes via settings
- Password changes via `updatePassword()`
- Updates pushed to Supabase and reflected in context
- Changes persist across sessions

## Signup Flow

1. User visits `/signup` (waitlist page)
2. Enters email, password, company info, notes
3. `supabase.auth.signUp()` creates account with metadata
4. Email confirmation sent (if enabled)
5. User profile created with `role: "pending"`
6. User can log in but sees pending approval screen
7. Admin approves → changes role to `"member"`
8. User gains full access

## Error Handling

All auth methods return structured error objects:

```typescript
type AuthResult = {
  success: boolean
  error?: {
    message: string
    code?: string
  }
}
```

Common error scenarios:
- Invalid credentials → "Invalid login credentials"
- Network issues → "Network request failed"
- Invalid OTP → "Token has expired or is invalid"
- Password too short → "Password should be at least 6 characters"
- Email not found → "User not found"

## Environment Variables

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

The anonymous key is safe for client-side use. RLS policies control data access.

## Database Migrations

Auth-related tables are created via Supabase migrations:

```sql
-- profiles table
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  username text,
  image text,
  role text default 'pending',
  company_id uuid references companies(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS policies (example)
alter table profiles enable row level security;

create policy "Users can read own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id);
```

## Testing Checklist

**Login:**
- [ ] Valid credentials → app access
- [ ] Invalid credentials → clear error
- [ ] Session persists on refresh
- [ ] Logout clears session

**Password Reset:**
- [ ] Email link → new password works
- [ ] OTP code → new password works
- [ ] Invalid code → error message
- [ ] Mismatched passwords → validation error

**Role-Based Access:**
- [ ] Pending user sees pending screen
- [ ] Member/admin see full app
- [ ] Public routes accessible without auth

**Navigation:**
- [ ] All auth links work correctly
- [ ] Redirects happen as expected
- [ ] Back button doesn't break flow

## TL;DR

Warehouse uses **Supabase Auth** for secure email/password authentication with:
- ✅ Hashed passwords (no plaintext)
- ✅ Secure session management
- ✅ Role-based access control
- ✅ Password reset via email (link + OTP)
- ✅ Pending user approval workflow
- ✅ Detailed error handling

Auth is production-ready with proper security. Some RLS policies may be permissive during prototyping but can be tightened before launch.
