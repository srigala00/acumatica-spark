import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Eye, Trash2, XCircle, Package, User, MapPin, Phone, Briefcase, FileText } from 'lucide-react';

const statusColors: Record<string, string> = {
  submitted: 'bg-info/10 text-info',
  sent_to_erp: 'bg-primary/10 text-primary',
  in_review: 'bg-warning/10 text-warning',
  processed: 'bg-accent/10 text-accent-foreground',
  on_delivery: 'bg-primary/10 text-primary',
  completed: 'bg-success/10 text-success',
  rejected: 'bg-destructive/10 text-destructive',
  closed: 'bg-muted text-muted-foreground',
};

const statusLabels: Record<string, string> = {
  submitted: 'Submitted',
  sent_to_erp: 'Sent to ERP',
  in_review: 'In Review',
  processed: 'Processed',
  on_delivery: 'On Delivery',
  completed: 'Completed',
  rejected: 'Rejected',
  closed: 'Closed',
};

const AdminOrders = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const { data: orders } = useQuery({
    queryKey: ['admin-all-orders'],
    queryFn: async () => {
      const { data } = await supabase
        .from('requests')
        .select('*, request_items(id, product_name, quantity, sku, specification)')
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('requests').update({ status: status as any }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-all-orders'] });
      toast({ title: 'Status updated' });
    },
  });

  const deleteOrder = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('requests').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-all-orders'] });
      toast({ title: 'Order deleted' });
      setSelectedOrder(null);
    },
  });

  const rejectOrder = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('requests').update({ status: 'rejected' as any }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-all-orders'] });
      toast({ title: 'Order rejected' });
    },
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-bold">Orders</h1>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders?.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono font-medium">{r.request_number}</TableCell>
                    <TableCell>{r.company_name}</TableCell>
                    <TableCell>
                      <div>{r.contact_person}</div>
                      <div className="text-xs text-muted-foreground">{r.email}</div>
                    </TableCell>
                    <TableCell>{(r.request_items as any[])?.length || 0}</TableCell>
                    <TableCell className="text-sm">{new Date(r.created_at).toLocaleDateString('id-ID')}</TableCell>
                    <TableCell>
                      <Select value={r.status} onValueChange={(v) => updateStatus.mutate({ id: r.id, status: v })}>
                        <SelectTrigger className="w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(statusLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setSelectedOrder(r)} title="View Detail">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => rejectOrder.mutate(r.id)} title="Reject" disabled={r.status === 'rejected'}>
                          <XCircle className="h-4 w-4 text-destructive" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" title="Delete">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Order?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete order {r.request_number}. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteOrder.mutate(r.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedOrder && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  {selectedOrder.request_number}
                  <Badge className={`text-xs ${statusColors[selectedOrder.status] || ''}`} variant="outline">
                    {statusLabels[selectedOrder.status] || selectedOrder.status}
                  </Badge>
                </DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="space-y-3 text-sm">
                  <h4 className="font-semibold flex items-center gap-2"><User className="h-4 w-4" /> Customer</h4>
                  <div className="space-y-2 pl-6">
                    <div>
                      <p className="text-muted-foreground text-xs">Company</p>
                      <p className="font-medium">{selectedOrder.company_name}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Contact</p>
                      <p className="font-medium">{selectedOrder.contact_person}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Phone / Email</p>
                      <p className="font-medium">{selectedOrder.phone || '-'} • {selectedOrder.email}</p>
                    </div>
                    {selectedOrder.business_account && (
                      <div>
                        <p className="text-muted-foreground text-xs">Business Account</p>
                        <p className="font-medium">{selectedOrder.business_account}</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-3 text-sm">
                  <h4 className="font-semibold flex items-center gap-2"><MapPin className="h-4 w-4" /> Shipping</h4>
                  <div className="space-y-2 pl-6">
                    <div>
                      <p className="text-muted-foreground text-xs">Address</p>
                      <p className="font-medium">{selectedOrder.shipping_address || '-'}</p>
                    </div>
                    {selectedOrder.description && (
                      <div>
                        <p className="text-muted-foreground text-xs">Notes</p>
                        <p className="font-medium">{selectedOrder.description}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-muted-foreground text-xs">Date</p>
                      <p className="font-medium">{new Date(selectedOrder.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <h4 className="font-semibold text-sm flex items-center gap-2 mb-2"><Package className="h-4 w-4" /> Items ({(selectedOrder.request_items as any[])?.length || 0})</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Spec</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(selectedOrder.request_items as any[])?.map((item: any, idx: number) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell className="font-medium">{item.product_name}</TableCell>
                        <TableCell className="font-mono text-xs">{item.sku || '-'}</TableCell>
                        <TableCell className="text-xs">{item.specification || '-'}</TableCell>
                        <TableCell className="text-right font-medium">{item.quantity}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminOrders;
