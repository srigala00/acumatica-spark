

## Plan: Add Favicon Link Tag to index.html

Currently `index.html` has no `<link rel="icon">` tag, so the browser falls back to the default `/favicon.ico`. We need to add a proper favicon link pointing to the existing `/logo_pln.png` (or another icon).

### Changes:
- **`index.html`**: Add `<link rel="icon" type="image/png" href="/logo_pln.png">` inside `<head>` after the viewport meta tag. Also update og:title and twitter:title from "Lovable App" to "MART PLNSC" for consistency.

