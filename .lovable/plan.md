

## Plan: Create Acumatica Proxy Edge Function

Create the file `supabase/functions/acumatica-proxy/index.ts` with the provided code, updated to use the modern `Deno.serve` pattern and proper CORS headers consistent with the project's other edge functions.

### Technical Details

1. **Create `supabase/functions/acumatica-proxy/index.ts`** with the user's provided proxy logic, adapting:
   - Replace `serve` import with `Deno.serve` (consistent with existing edge functions)
   - Update CORS headers to include all required Supabase client headers (matching `create-user` and `manage-user` patterns)
   - Keep all proxy logic intact: login cookie handling (base64 encode/decode), logout, and general request forwarding to Acumatica

2. **Deploy** the edge function to verify it works.

No database changes needed.

