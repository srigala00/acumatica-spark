

# Add User & Update User Roles

## Overview
Add an "Add User" dialog to the Admin Users page and update the role enum from `(super_admin, admin, buyer)` to `(super_admin, sales, buyer)`.

## Changes

### 1. Database Migration
- Alter the `app_role` enum: add `sales`, remove `admin`
- Update any existing `admin` roles to `sales`
- Update RLS policies that reference `'admin'` to reference `'sales'`

### 2. Admin Users Page (`src/pages/admin/AdminUsers.tsx`)
- Add an "Add User" button that opens a Dialog
- Dialog form fields: Full Name, Email, Phone, Password, Role (select: super_admin / sales / buyer)
- On submit: call `supabase.auth.signUp` via an edge function (since admin-creating-user requires service role key), then assign the selected role
- Refetch user list on success

### 3. Edge Function: `create-user`
- Accepts: `{ email, password, full_name, phone, role }`
- Uses service role key to call `supabase.auth.admin.createUser`
- Inserts the chosen role into `user_roles` (replacing the default `buyer` if different)
- Returns success/error

### 4. Auth Context Update (`src/contexts/AuthContext.tsx`)
- Change `AppRole` type from `'super_admin' | 'admin' | 'buyer'` to `'super_admin' | 'sales' | 'buyer'`
- Update `isAdmin` check to use `'sales'` instead of `'admin'`

### 5. RLS Policy Updates
All policies currently checking `has_role(auth.uid(), 'admin')` will be updated to check `has_role(auth.uid(), 'sales')`.

### 6. Admin Sidebar & Route Guards
- Update any references from `admin` role to `sales` in route guards and sidebar visibility logic

