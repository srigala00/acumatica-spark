import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import PublicLayout from '@/components/layout/PublicLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Package, ArrowLeft, FileText } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const formatPrice = (price: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(price);

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*, categories(name, slug)')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-96 rounded-lg" />
        </div>
      </PublicLayout>
    );
  }

  if (!product) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-16 text-center">
          <Package className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
          <h2 className="font-display text-2xl font-bold mb-2">Product Not Found</h2>
          <Button asChild><Link to="/products">Back to Products</Link></Button>
        </div>
      </PublicLayout>
    );
  }

  const specs = product.specifications as Record<string, string> | null;

  return (
    <PublicLayout>
      <div className="bg-muted/30 py-4 border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-primary">Home</Link>
            <span>/</span>
            <Link to="/products" className="hover:text-primary">Products</Link>
            <span>/</span>
            <span className="text-foreground font-medium">{product.name}</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Image */}
          <div className="aspect-square bg-muted rounded-xl flex items-center justify-center overflow-hidden">
            {product.image_url ? (
              <img src={product.image_url} alt={product.name} className="object-cover w-full h-full" />
            ) : (
              <Package className="h-32 w-32 text-muted-foreground/20" />
            )}
          </div>

          {/* Info */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="text-primary border-primary/20">{product.brand}</Badge>
              <Badge variant="secondary">{(product.categories as any)?.name}</Badge>
            </div>

            <h1 className="font-display text-3xl font-bold mb-2">{product.name}</h1>
            <p className="text-muted-foreground mb-1">SKU: {product.sku}</p>

            {product.estimated_price ? (
              <p className="font-display text-3xl font-bold text-primary mt-4 mb-6">
                {formatPrice(product.estimated_price)}
              </p>
            ) : (
              <p className="text-lg text-muted-foreground italic mt-4 mb-6">Price available upon request</p>
            )}

            {product.description && (
              <div className="mb-6">
                <h3 className="font-display font-semibold mb-2">Description</h3>
                <p className="text-muted-foreground">{product.description}</p>
              </div>
            )}

            {specs && Object.keys(specs).length > 0 && (
              <Card className="mb-6">
                <CardContent className="p-4">
                  <h3 className="font-display font-semibold mb-3">Technical Specifications</h3>
                  <div className="space-y-2">
                    {Object.entries(specs).map(([key, val]) => (
                      <div key={key} className="flex justify-between text-sm py-1.5 border-b border-border last:border-0">
                        <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</span>
                        <span className="font-medium">{val}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Button size="lg" className="w-full sm:w-auto" onClick={() => {
              if (!user) {
                navigate('/login');
              } else {
                navigate(`/rfq?product=${product.id}`);
              }
            }}>
              <FileText className="h-4 w-4 mr-2" /> Request Quotation
            </Button>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};

export default ProductDetail;
