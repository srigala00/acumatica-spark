

# B2B Industrial Spare Parts Marketplace

A corporate procurement portal inspired by PLN Suku Cadang (mart.plnsc.co.id) with teal/cyan accent colors, white background, and industrial corporate styling.

## Phase 1: Public Storefront & Auth

### Landing Page
- Top bar with search (filterable by category), sign in / register links
- Hero banner area
- Category grid with icons (Boiler, Generator, Consumables, Tools, etc.)
- Featured products section with product cards (image, name, SKU, brand)
- Footer with company info

### Authentication
- Corporate buyer registration (company name, contact person, email, phone, password)
- Login page
- Role-based access: Super Admin, Admin, Buyer

### Product Catalog Pages
- Category listing page with sidebar filters (brand, category)
- Product grid with search and sort
- Product detail page showing: name, SKU, brand, description, specs, images, "Request Quote" button

## Phase 2: RFQ / Request System

### Request Submission (Buyer)
- Multi-line item RFQ form: select products, specify quantity, specs, attach files
- Or custom quotation request (products not in catalog)
- Request confirmation with tracking number

### Request Tracking (Buyer)
- Dashboard showing submitted requests with statuses: Submitted → Sent to ERP → In Review → Closed
- Request detail view

## Phase 3: Admin Dashboard

### Analytics Dashboard
- Total requests, total buyers, most requested products
- Monthly request volume chart (bar/line chart)
- Recent requests list

### Product Management
- CRUD for products (SKU, name, brand, category, description, specs, image upload)
- Category management
- Activate/deactivate products

### User Management
- Create/edit/disable users
- Assign roles (Super Admin, Admin, Buyer)
- Company account management

### Request Management
- View all incoming requests
- Update request status
- View request details and line items

## Phase 4: ERP Integration Layer

### Mock Acumatica Integration
- Edge function: `POST /api/opportunities` endpoint
- Maps RFQ data to Acumatica Opportunity fields
- Logs integration attempts with success/failure status
- Placeholder for real API credentials (to be added later)
- Integration settings page in Super Admin panel

## Database Structure (Lovable Cloud / Supabase)
- **users** + **user_roles** (secure role management)
- **companies** (buyer companies)
- **categories** (product categories)
- **products** (catalog items with specs and images)
- **requests** (RFQ headers with status tracking)
- **request_items** (line items per request)
- **attachments** (file uploads linked to requests)

## Design
- Teal/cyan primary color (#00BCD4 range), white background
- Corporate industrial feel matching PLN Suku Cadang
- Sidebar navigation for admin/dashboard pages
- Responsive layout for desktop-first (with mobile support)

