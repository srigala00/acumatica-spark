import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight, Package, ShoppingCart } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(price);
};

const stockColors: Record<string, string> = {
  available: 'bg-success/10 text-success border-success/20',
  limited: 'bg-warning/10 text-warning border-warning/20',
  out_of_stock: 'bg-destructive/10 text-destructive border-destructive/20',
};

const stockLabels: Record<string, string> = {
  available: 'In Stock',
  limited: 'Limited Stock',
  out_of_stock: 'Out of Stock',
};

const FeaturedProducts = () => {
  const { data: products, isLoading } = useQuery({
    queryKey: ['featured-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*, categories(name, slug)')
        .eq('is_active', true)
        .limit(8);
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="font-display text-3xl font-bold mb-10">Featured Products</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-72 rounded-lg" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="font-display text-3xl font-bold">Featured Products</h2>
            <p className="text-muted-foreground mt-1">Top industrial spare parts available for quotation</p>
          </div>
          <Button variant="outline" asChild>
            <Link to="/products">
              View All <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products?.map((product) => (
            <Link key={product.id} to={`/products/${product.id}`}>
              <Card className="group hover:shadow-lg transition-all duration-200 overflow-hidden h-full">
                <div className="aspect-square bg-muted flex items-center justify-center relative overflow-hidden">
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
                  <p className="text-xs text-primary font-medium mb-1">{product.brand}</p>
                  <h3 className="font-semibold text-sm line-clamp-2 mb-1 group-hover:text-primary transition-colors">{product.name}</h3>
                  <p className="text-xs text-muted-foreground mb-2">SKU: {product.sku}</p>
                  {product.estimated_price && (
                    <p className="font-display font-bold text-primary">{formatPrice(product.estimated_price)}</p>
                  )}
                  {!product.estimated_price && (
                    <p className="text-sm text-muted-foreground italic">Request for price</p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedProducts;
