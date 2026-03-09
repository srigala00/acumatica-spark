import { useAuth } from '@/contexts/AuthContext';
import PublicLayout from '@/components/layout/PublicLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { FileText, Package, User, ArrowRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const BuyerDashboard = () => {
  const { user, profile } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ['buyer-stats'],
    queryFn: async () => {
      const { count: totalRequests } = await supabase
        .from('requests').select('*', { count: 'exact', head: true }).eq('user_id', user!.id);
      const { count: activeRequests } = await supabase
        .from('requests').select('*', { count: 'exact', head: true }).eq('user_id', user!.id).neq('status', 'closed');
      return { totalRequests: totalRequests || 0, activeRequests: activeRequests || 0 };
    },
    enabled: !!user,
  });

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold">Welcome, {profile?.full_name || 'User'}</h1>
          <p className="text-muted-foreground">Your procurement dashboard</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-display font-bold">{stats?.totalRequests ?? '-'}</p>
                <p className="text-sm text-muted-foreground">Total Requests</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
                <Package className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-display font-bold">{stats?.activeRequests ?? '-'}</p>
                <p className="text-sm text-muted-foreground">Active Requests</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                <User className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-2xl font-display font-bold">Buyer</p>
                <p className="text-sm text-muted-foreground">Account Type</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <h3 className="font-display font-semibold mb-2">Submit New RFQ</h3>
              <p className="text-sm text-muted-foreground mb-4">Request a quotation for spare parts and equipment</p>
              <Button asChild><Link to="/rfq">Submit Request <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <h3 className="font-display font-semibold mb-2">View My Requests</h3>
              <p className="text-sm text-muted-foreground mb-4">Track status of your quotation requests</p>
              <Button variant="outline" asChild><Link to="/requests">View Requests <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </PublicLayout>
  );
};

export default BuyerDashboard;
