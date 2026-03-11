

# Allow Sales Role to Edit Customer Email

Currently, the email field in the edit user dialog and the backend edge function are restricted to `super_admin` only. The change is to allow both `super_admin` and `sales` roles to edit emails.

## Changes

### 1. Backend: `supabase/functions/manage-user/index.ts`
- Remove the `super_admin`-only restriction on the email update block (lines 133-138). Allow it if the caller is either `super_admin` or `sales` (which is already verified at the top of the function).

### 2. Frontend: `src/pages/admin/AdminUsers.tsx`
- Move the email field **outside** the `{isSuperAdmin && (...)}` block so it's visible to both `super_admin` and `sales` roles.
- Keep the role selector inside the `isSuperAdmin` guard (only super_admin can change roles).
- Update the `handleEditSubmit` logic to always send `editForm.email` if provided, not just when `isSuperAdmin`.

### 3. Frontend: Pre-populate email in edit dialog
- Currently the user's email is not stored in `profiles` — it comes from the auth system. We need to fetch and display the current email. Looking at the query, emails aren't fetched. We'll need to either:
  - Use the `manage-user` edge function with a `list_users` action, or
  - Show the email field as "Change Email" with a placeholder, keeping the current behavior.

Since the current email isn't available client-side (it's in `auth.users`), we'll keep the UX as "Change Email (leave blank to keep current)" — same pattern, just now available to sales too.

