import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import PublicLayout from '@/components/layout/PublicLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Package, Filter, X, ShoppingCart } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';

const formatPrice = (price: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(price);

const stockColors: Record<string, string> = {
  available: 'bg-success/10 text-success border-success/20',
  limited: 'bg-warning/10 text-warning border-warning/20',
  out_of_stock: 'bg-destructive/10 text-destructive border-destructive/20',
};
const stockLabels: Record<string, string> = {
  available: 'In Stock', limited: 'Limited Stock', out_of_stock: 'Out of Stock',
};

const Products = () => {
  const { addToCart } = useCart();
  const [searchParams, setSearchParams] = useSearchParams();
  const categorySlug = searchParams.get('category') || '';
  const searchQuery = searchParams.get('search') || '';
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [selectedBrand, setSelectedBrand] = useState('');

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await supabase.from('categories').select('*').eq('is_active', true).order('sort_order');
      return data || [];
    },
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ['products', categorySlug, searchQuery, selectedBrand],
    queryFn: async () => {
      let query = supabase.from('products').select('*, categories(name, slug)').eq('is_active', true);
      if (categorySlug) {
        const cat = categories?.find(c => c.slug === categorySlug);
        if (cat) query = query.eq('category_id', cat.id);
      }
      if (searchQuery) query = query.or(`name.ilike.%${searchQuery}%,sku.ilike.%${searchQuery}%,brand.ilike.%${searchQuery}%`);
      if (selectedBrand) query = query.eq('brand', selectedBrand);
      const { data } = await query.order('name');
      return data || [];
    },
    enabled: !!categories,
  });

  const brands = [...new Set(products?.map(p => p.brand).filter(Boolean) || [])].sort();

  const handleSearch = () => {
    const params = new URLSearchParams(searchParams);
    if (localSearch) params.set('search', localSearch); else params.delete('search');
    setSearchParams(params);
  };

  const clearFilters = () => {
    setSearchParams({});
    setLocalSearch('');
    setSelectedBrand('');
  };

  const activeCategory = categories?.find(c => c.slug === categorySlug);

  return (
    <PublicLayout>
      <div className="bg-muted/30 py-4 border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-primary">Home</Link>
            <span>/</span>
            <span className="text-foreground font-medium">
              {activeCategory ? activeCategory.name : 'All Products'}
            </span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Filters */}
          <aside className="w-full lg:w-64 shrink-0">
            <div className="sticky top-24 space-y-6">
              <div>
                <h3 className="font-display font-semibold mb-3 flex items-center gap-2">
                  <Filter className="h-4 w-4" /> Filters
                </h3>
                {(categorySlug || searchQuery || selectedBrand) && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs mb-2">
                    <X className="h-3 w-3 mr-1" /> Clear all
                  </Button>
                )}
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2">Category</h4>
                <div className="space-y-1">
                  <Link to="/products" className={`block text-sm px-3 py-1.5 rounded-md ${!categorySlug ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:text-foreground'}`}>
                    All Categories
                  </Link>
                  {categories?.map(cat => (
                    <Link key={cat.id} to={`/products?category=${cat.slug}`}
                      className={`block text-sm px-3 py-1.5 rounded-md ${categorySlug === cat.slug ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:text-foreground'}`}>
                      {cat.name}
                    </Link>
                  ))}
                </div>
              </div>

              {brands.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Brand</h4>
                  <Select value={selectedBrand || "all"} onValueChange={(v) => setSelectedBrand(v === "all" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="All brands" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All brands</SelectItem>
                      {brands.map(b => <SelectItem key={b} value={b!}>{b}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </aside>

          {/* Products Grid */}
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search products..." className="pl-10" value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
              </div>
              <Button onClick={handleSearch}>Search</Button>
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              {isLoading ? 'Loading...' : `${products?.length || 0} products found`}
            </p>

            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-lg" />)}
              </div>
            ) : products?.length === 0 ? (
              <div className="text-center py-16">
                <Package className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="font-display font-semibold text-lg mb-2">No products found</h3>
                <p className="text-muted-foreground">Try adjusting your search or filters</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {products?.map(product => (
                    <div key={product.id} className="relative group">
                    <Link to={`/products/${product.id}`}>
                    <Card className="hover:shadow-lg transition-all duration-200 overflow-hidden h-full">
                      <div className="aspect-[4/3] bg-muted flex items-center justify-center relative">
                        {product.image_url ? (
                          <img src={product.image_url} alt={product.name} className="object-cover w-full h-full" />
                        ) : (
                          <Package className="h-16 w-16 text-muted-foreground/30" />
                        )}
                        <Badge className={`absolute top-3 right-3 text-xs ${stockColors[product.stock_indicator || 'available']}`} variant="outline">
                          {stockLabels[product.stock_indicator || 'available']}
                        </Badge>
                      </div>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-primary font-medium">{product.brand}</span>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground">{(product.categories as any)?.name}</span>
                        </div>
                        <h3 className="font-semibold text-sm line-clamp-2 mb-1 group-hover:text-primary transition-colors">{product.name}</h3>
                        <p className="text-xs text-muted-foreground mb-2">SKU: {product.sku}</p>
                        {product.estimated_price ? (
                          <p className="font-display font-bold text-primary">{formatPrice(product.estimated_price)}</p>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">Request for price</p>
                        )}
                      </CardContent>
                    </Card>
                    </Link>
                    <Button
                      size="icon"
                      className="absolute bottom-3 right-3 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                      onClick={(e) => {
                        e.preventDefault();
                        addToCart({
                          product_id: product.id,
                          name: product.name,
                          sku: product.sku,
                          brand: product.brand,
                          image_url: product.image_url,
                          estimated_price: product.estimated_price,
                        });
                      }}
                    >
                      <ShoppingCart className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};

export default Products;
