

## Plan: Marketplace-Style Cart Flow

### Overview
Transform the current direct-order flow into a marketplace-style experience: browse products, select quantity, add to cart, review cart, then submit order.

### Architecture

The cart will be **client-side** using React Context + localStorage (no new database tables needed). The existing `requests` and `request_items` tables already support the final order submission.

```text
Product List/Detail → Add to Cart → Cart Page → Submit Order
     [qty picker]      [context]     [review]    [existing DB]
```

### Changes

#### 1. Create Cart Context (`src/contexts/CartContext.tsx`)
- State: array of `{ product_id, name, sku, brand, image_url, estimated_price, quantity, specification }`
- Functions: `addToCart`, `removeFromCart`, `updateQuantity`, `updateSpecification`, `clearCart`, `cartCount`
- Persist to `localStorage` so cart survives page refresh
- Wrap app in `CartProvider` (in `App.tsx`)

#### 2. Update Product Detail Page (`src/pages/ProductDetail.tsx`)
- Add quantity selector (input with +/- buttons) before the order button
- Change "Order Now" button to **"Add to Cart"** with a toast confirmation
- Keep ability to go to cart after adding

#### 3. Add "Add to Cart" on Product Cards (Products page + Featured)
- Add a small cart button on product cards in `Products.tsx` and `FeaturedProducts.tsx` (quick-add with qty=1)

#### 4. Cart Icon in Header (`src/components/layout/Header.tsx`)
- Add shopping cart icon with badge showing item count next to user actions
- Links to `/cart`

#### 5. Create Cart Page (`src/pages/Cart.tsx`)
- Display all cart items in a table/list: image, name, SKU, qty (editable), specification (editable), price, remove button
- Show order summary (total items, estimated total if prices available)
- Company info form (same fields as current OrderSubmission: company name, contact, email, phone, notes)
- "Submit Order" button that creates `requests` + `request_items` records (reuse existing logic from OrderSubmission)
- Register route `/cart` in `App.tsx`

#### 6. Update OrderSubmission Page
- Either redirect `/order` to `/cart`, or keep it as a secondary flow
- Remove manual product selection since cart handles it

### No Database Changes Required
The existing `requests` and `request_items` tables already support this flow perfectly.

