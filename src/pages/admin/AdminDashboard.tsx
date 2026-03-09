import AdminLayout from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FileText, Users, Package, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const AdminDashboard = () => {
  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [reqRes, usersRes, productsRes] = await Promise.all([
        supabase.from('requests').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('products').select('*', { count: 'exact', head: true }),
      ]);
      return {
        totalRequests: reqRes.count || 0,
        totalUsers: usersRes.count || 0,
        totalProducts: productsRes.count || 0,
      };
    },
  });

  const { data: recentRequests } = useQuery({
    queryKey: ['admin-recent-requests'],
    queryFn: async () => {
      const { data } = await supabase
        .from('requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      return data || [];
    },
  });

  const { data: monthlyData } = useQuery({
    queryKey: ['admin-monthly'],
    queryFn: async () => {
      const { data } = await supabase.from('requests').select('created_at');
      const months: Record<string, number> = {};
      data?.forEach(r => {
        const m = new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        months[m] = (months[m] || 0) + 1;
      });
      return Object.entries(months).map(([month, count]) => ({ month, count }));
    },
  });

  const statCards = [
    { title: 'Total Requests', value: stats?.totalRequests ?? '-', icon: FileText, color: 'text-primary' },
    { title: 'Total Buyers', value: stats?.totalUsers ?? '-', icon: Users, color: 'text-info' },
    { title: 'Total Products', value: stats?.totalProducts ?? '-', icon: Package, color: 'text-success' },
    { title: 'This Month', value: monthlyData?.length ? monthlyData[monthlyData.length - 1]?.count ?? 0 : '-', icon: TrendingUp, color: 'text-warning' },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-bold">Dashboard</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map(s => (
            <Card key={s.title}>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                  <s.icon className={`h-6 w-6 ${s.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-display font-bold">{s.value}</p>
                  <p className="text-sm text-muted-foreground">{s.title}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-display">Monthly Request Volume</CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyData && monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(187, 100%, 42%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground text-center py-8">No request data yet</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-display">Recent Requests</CardTitle>
            </CardHeader>
            <CardContent>
              {recentRequests?.length ? (
                <div className="space-y-3">
                  {recentRequests.map(r => (
                    <div key={r.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div>
                        <p className="font-medium text-sm">{r.request_number}</p>
                        <p className="text-xs text-muted-foreground">{r.company_name}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(r.created_at).toLocaleDateString('id-ID')}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No requests yet</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
