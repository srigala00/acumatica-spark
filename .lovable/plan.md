

## Promote User to Super Admin

The user needs their account (`zero.ookami@gmail.com`) promoted to `super_admin` role so they can access the admin panel at `/admin`.

### Steps
1. Look up the user's `user_id` from the `profiles` table by matching against auth email
2. Insert a `super_admin` role into `user_roles` for that user (they already have `buyer` from the signup trigger)

This is a single data operation using the insert tool — no schema changes needed.

