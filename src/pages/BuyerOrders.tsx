import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import PublicLayout from '@/components/layout/PublicLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Plus, Clock, CheckCircle, Send, Archive } from 'lucide-react';

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  submitted: { label: 'Submitted', color: 'bg-info/10 text-info border-info/20', icon: Clock },
  sent_to_erp: { label: 'Sent to ERP', color: 'bg-primary/10 text-primary border-primary/20', icon: Send },
  in_review: { label: 'In Review', color: 'bg-warning/10 text-warning border-warning/20', icon: FileText },
  closed: { label: 'Closed', color: 'bg-success/10 text-success border-success/20', icon: CheckCircle },
};

const BuyerOrders = () => {
  const { user } = useAuth();

  const { data: orders, isLoading } = useQuery({
    queryKey: ['my-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('requests')
        .select('*, request_items(count)')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold">My Orders</h1>
            <p className="text-muted-foreground">Track your orders</p>
          </div>
          <Button asChild>
            <Link to="/order"><Plus className="h-4 w-4 mr-2" /> New Order</Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
          </div>
        ) : orders?.length === 0 ? (
          <div className="text-center py-16">
            <Archive className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="font-display font-semibold text-lg mb-2">No orders yet</h3>
            <p className="text-muted-foreground mb-4">Start by submitting your first order</p>
            <Button asChild><Link to="/order">Submit Order</Link></Button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders?.map(order => {
              const status = statusConfig[order.status] || statusConfig.submitted;
              const StatusIcon = status.icon;
              return (
                <Card key={order.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-display font-semibold">{order.request_number}</h3>
                          <Badge className={`text-xs ${status.color}`} variant="outline">
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {status.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">{order.company_name} • {order.contact_person}</p>
                        {order.description && <p className="text-sm text-muted-foreground line-clamp-1">{order.description}</p>}
                      </div>
                      <div className="text-right text-sm text-muted-foreground shrink-0">
                        {new Date(order.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </PublicLayout>
  );
};

export default BuyerOrders;
