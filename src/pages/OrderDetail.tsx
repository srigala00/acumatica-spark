import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import PublicLayout from '@/components/layout/PublicLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Package, User, MapPin, Phone, Briefcase, FileText } from 'lucide-react';

const statusConfig: Record<string, { label: string; color: string }> = {
  submitted: { label: 'Submitted', color: 'bg-info/10 text-info border-info/20' },
  sent_to_erp: { label: 'Sent to ERP', color: 'bg-primary/10 text-primary border-primary/20' },
  in_review: { label: 'In Review', color: 'bg-warning/10 text-warning border-warning/20' },
  processed: { label: 'Processed', color: 'bg-accent/10 text-accent-foreground border-accent/20' },
  on_delivery: { label: 'On Delivery', color: 'bg-primary/10 text-primary border-primary/20' },
  completed: { label: 'Completed', color: 'bg-success/10 text-success border-success/20' },
  rejected: { label: 'Rejected', color: 'bg-destructive/10 text-destructive border-destructive/20' },
  closed: { label: 'Closed', color: 'bg-muted text-muted-foreground border-muted' },
};

const OrderDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: order, isLoading } = useQuery({
    queryKey: ['order-detail', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('requests')
        .select('*, request_items(id, product_name, quantity, sku, specification, product_id)')
        .eq('id', id!)
        .single();
      if (error) throw error;

      // Fetch prices for items with product_id
      const productIds = (data.request_items as any[])?.map((i: any) => i.product_id).filter(Boolean) || [];
      let priceMap: Record<string, number> = {};
      if (productIds.length > 0) {
        const { data: prods } = await supabase.from('products').select('id, estimated_price').in('id', productIds);
        prods?.forEach(p => { if (p.estimated_price) priceMap[p.id] = p.estimated_price; });
      }

      return { ...data, _priceMap: priceMap };
    },
    enabled: !!id && !!user,
  });

  if (isLoading) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-8 max-w-4xl space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64" />
        </div>
      </PublicLayout>
    );
  }

  if (!order) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-muted-foreground">Order not found.</p>
          <Button asChild className="mt-4"><Link to="/orders">Back to Orders</Link></Button>
        </div>
      </PublicLayout>
    );
  }

  const status = statusConfig[order.status] || statusConfig.submitted;
  const items = (order.request_items as any[]) || [];
  const priceMap = (order as any)._priceMap || {};
  const formatPrice = (price: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(price);
  const totalEstimated = items.reduce((sum: number, item: any) => {
    const price = priceMap[item.product_id];
    return sum + (price ? price * item.quantity : 0);
  }, 0);

  return (
    <PublicLayout>
      <div className="bg-muted/30 py-4 border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-primary">Home</Link>
            <span>/</span>
            <Link to="/orders" className="hover:text-primary">Orders</Link>
            <span>/</span>
            <span className="text-foreground font-medium">{order.request_number}</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button variant="ghost" onClick={() => navigate('/orders')} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Orders
        </Button>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-bold">{order.request_number}</h1>
            <p className="text-sm text-muted-foreground">
              {new Date(order.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <Badge className={`text-sm px-3 py-1 ${status.color}`} variant="outline">
            {status.label}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4" /> Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <Briefcase className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-muted-foreground text-xs">Company</p>
                  <p className="font-medium">{order.company_name}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-muted-foreground text-xs">Contact Person</p>
                  <p className="font-medium">{order.contact_person}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-muted-foreground text-xs">Phone / Email</p>
                  <p className="font-medium">{order.phone || '-'} • {order.email}</p>
                </div>
              </div>
              {(order as any).business_account && (
                <div className="flex items-start gap-2">
                  <Briefcase className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-muted-foreground text-xs">Business Account</p>
                    <p className="font-medium">{(order as any).business_account}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4" /> Shipping Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-muted-foreground text-xs">Shipping Address</p>
                  <p className="font-medium">{(order as any).shipping_address || '-'}</p>
                </div>
              </div>
              {order.description && (
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-muted-foreground text-xs">Notes</p>
                    <p className="font-medium">{order.description}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" /> Order Items ({items.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Specification</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Ext. Price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item: any, idx: number) => {
                  const unitPrice = priceMap[item.product_id];
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell className="font-medium">{item.product_name}</TableCell>
                      <TableCell className="font-mono text-sm">{item.sku || '-'}</TableCell>
                      <TableCell className="text-sm">{item.specification || '-'}</TableCell>
                      <TableCell className="text-right font-medium">{item.quantity}</TableCell>
                      <TableCell className="text-right text-sm">{unitPrice ? formatPrice(unitPrice) : '-'}</TableCell>
                      <TableCell className="text-right font-medium">{unitPrice ? formatPrice(unitPrice * item.quantity) : '-'}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {totalEstimated > 0 && (
              <div className="flex justify-end px-4 py-3 border-t border-border">
                <div className="text-sm font-semibold">Total Estimated: <span className="text-primary">{formatPrice(totalEstimated)}</span></div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PublicLayout>
  );
};

export default OrderDetail;
