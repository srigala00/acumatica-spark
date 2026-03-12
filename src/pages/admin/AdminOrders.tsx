import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/layout/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Eye, Trash2, XCircle, Package, User, MapPin, Pencil, Plus, Save, X } from 'lucide-react';

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
  const [editing, setEditing] = useState(false);
  const [editOrderInfo, setEditOrderInfo] = useState<any>({});
  const [editItems, setEditItems] = useState<any[]>([]);
  const [deletedItemIds, setDeletedItemIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Add item state
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItem, setNewItem] = useState({ product_id: '', product_name: '', sku: '', quantity: 1, specification: '', inventory_id: '' });

  const { data: orders } = useQuery({
    queryKey: ['admin-all-orders'],
    queryFn: async () => {
      const { data } = await supabase
        .from('requests')
        .select('*, request_items(id, product_name, quantity, sku, specification, product_id, inventory_id)')
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  const { data: products } = useQuery({
    queryKey: ['products-for-order'],
    queryFn: async () => {
      const { data } = await supabase.from('products').select('id, name, sku, inventory_id, estimated_price').eq('is_active', true).order('name');
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

  const startEditing = () => {
    if (!selectedOrder) return;
    setEditOrderInfo({
      company_name: selectedOrder.company_name,
      contact_person: selectedOrder.contact_person,
      email: selectedOrder.email,
      phone: selectedOrder.phone || '',
      shipping_address: selectedOrder.shipping_address || '',
      business_account: selectedOrder.business_account || '',
      description: selectedOrder.description || '',
    });
    setEditItems((selectedOrder.request_items as any[])?.map((item: any) => ({ ...item })) || []);
    setDeletedItemIds([]);
    setEditing(true);
    setShowAddItem(false);
  };

  const cancelEditing = () => {
    setEditing(false);
    setShowAddItem(false);
    setDeletedItemIds([]);
  };

  const handleAddProduct = () => {
    if (!newItem.product_name) return;
    setEditItems(prev => [...prev, {
      id: `new-${Date.now()}`,
      product_id: newItem.product_id || null,
      product_name: newItem.product_name,
      sku: newItem.sku,
      quantity: newItem.quantity,
      specification: newItem.specification,
      inventory_id: newItem.inventory_id,
      _isNew: true,
    }]);
    setNewItem({ product_id: '', product_name: '', sku: '', quantity: 1, specification: '', inventory_id: '' });
    setShowAddItem(false);
  };

  const selectProduct = (productId: string) => {
    const p = products?.find(pr => pr.id === productId);
    if (p) {
      setNewItem({
        product_id: p.id,
        product_name: p.name,
        sku: p.sku,
        quantity: 1,
        specification: '',
        inventory_id: p.inventory_id || '',
      });
    }
  };

  const removeEditItem = (idx: number) => {
    const item = editItems[idx];
    if (item && !item._isNew) {
      setDeletedItemIds(prev => [...prev, item.id]);
    }
    setEditItems(prev => prev.filter((_, i) => i !== idx));
  };

  const updateEditItem = (idx: number, field: string, value: any) => {
    setEditItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const saveEdits = async () => {
    if (!selectedOrder) return;
    setSaving(true);
    try {
      // Update order info
      const { error: orderErr } = await supabase.from('requests').update({
        company_name: editOrderInfo.company_name,
        contact_person: editOrderInfo.contact_person,
        email: editOrderInfo.email,
        phone: editOrderInfo.phone || null,
        shipping_address: editOrderInfo.shipping_address || null,
        business_account: editOrderInfo.business_account || null,
        description: editOrderInfo.description || null,
      } as any).eq('id', selectedOrder.id);
      if (orderErr) throw orderErr;

      // Delete removed items
      for (const id of deletedItemIds) {
        await supabase.from('request_items').delete().eq('id', id);
      }

      // Update existing items & insert new ones
      for (const item of editItems) {
        if (item._isNew) {
          await supabase.from('request_items').insert({
            request_id: selectedOrder.id,
            product_id: item.product_id || null,
            product_name: item.product_name,
            sku: item.sku || null,
            quantity: item.quantity,
            specification: item.specification || null,
            inventory_id: item.inventory_id || null,
          } as any);
        } else {
          await supabase.from('request_items').update({
            product_name: item.product_name,
            quantity: item.quantity,
            specification: item.specification || null,
            inventory_id: item.inventory_id || null,
          } as any).eq('id', item.id);
        }
      }

      toast({ title: 'Order updated successfully' });
      setEditing(false);
      setSelectedOrder(null);
      queryClient.invalidateQueries({ queryKey: ['admin-all-orders'] });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

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
                        <Button variant="ghost" size="icon" onClick={() => { setSelectedOrder(r); setEditing(false); }} title="View Detail">
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
      <Dialog open={!!selectedOrder} onOpenChange={(open) => { if (!open) { setSelectedOrder(null); setEditing(false); } }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {selectedOrder && !editing && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  {selectedOrder.request_number}
                  <Badge className={`text-xs ${statusColors[selectedOrder.status] || ''}`} variant="outline">
                    {statusLabels[selectedOrder.status] || selectedOrder.status}
                  </Badge>
                  <Button variant="outline" size="sm" className="ml-auto" onClick={startEditing}>
                    <Pencil className="h-3 w-3 mr-1" /> Edit
                  </Button>
                </DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="space-y-3 text-sm">
                  <h4 className="font-semibold flex items-center gap-2"><User className="h-4 w-4" /> Customer</h4>
                  <div className="space-y-2 pl-6">
                    <div><p className="text-muted-foreground text-xs">Company</p><p className="font-medium">{selectedOrder.company_name}</p></div>
                    <div><p className="text-muted-foreground text-xs">Contact</p><p className="font-medium">{selectedOrder.contact_person}</p></div>
                    <div><p className="text-muted-foreground text-xs">Phone / Email</p><p className="font-medium">{selectedOrder.phone || '-'} • {selectedOrder.email}</p></div>
                    <div><p className="text-muted-foreground text-xs">Business Account</p><p className="font-medium">{selectedOrder.business_account || '-'}</p></div>
                  </div>
                </div>
                <div className="space-y-3 text-sm">
                  <h4 className="font-semibold flex items-center gap-2"><MapPin className="h-4 w-4" /> Shipping</h4>
                  <div className="space-y-2 pl-6">
                    <div><p className="text-muted-foreground text-xs">Address</p><p className="font-medium">{selectedOrder.shipping_address || '-'}</p></div>
                    {selectedOrder.description && (
                      <div><p className="text-muted-foreground text-xs">Notes</p><p className="font-medium">{selectedOrder.description}</p></div>
                    )}
                    <div><p className="text-muted-foreground text-xs">Date</p><p className="font-medium">{new Date(selectedOrder.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p></div>
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
                      <TableHead>Inventory ID</TableHead>
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
                        <TableCell className="font-mono text-xs">{item.inventory_id || '-'}</TableCell>
                        <TableCell className="text-xs">{item.specification || '-'}</TableCell>
                        <TableCell className="text-right font-medium">{item.quantity}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}

          {/* Edit Mode */}
          {selectedOrder && editing && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  Edit: {selectedOrder.request_number}
                  <div className="ml-auto flex gap-2">
                    <Button variant="outline" size="sm" onClick={cancelEditing} disabled={saving}>
                      <X className="h-3 w-3 mr-1" /> Cancel
                    </Button>
                    <Button size="sm" onClick={saveEdits} disabled={saving}>
                      <Save className="h-3 w-3 mr-1" /> {saving ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                </DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                <div className="space-y-2">
                  <Label className="text-xs">Company Name</Label>
                  <Input value={editOrderInfo.company_name} onChange={e => setEditOrderInfo((p: any) => ({ ...p, company_name: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Contact Person</Label>
                  <Input value={editOrderInfo.contact_person} onChange={e => setEditOrderInfo((p: any) => ({ ...p, contact_person: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Email</Label>
                  <Input value={editOrderInfo.email} onChange={e => setEditOrderInfo((p: any) => ({ ...p, email: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Phone</Label>
                  <Input value={editOrderInfo.phone} onChange={e => setEditOrderInfo((p: any) => ({ ...p, phone: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Business Account</Label>
                  <Input value={editOrderInfo.business_account} onChange={e => setEditOrderInfo((p: any) => ({ ...p, business_account: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Shipping Address</Label>
                  <Input value={editOrderInfo.shipping_address} onChange={e => setEditOrderInfo((p: any) => ({ ...p, shipping_address: e.target.value }))} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs">Notes</Label>
                  <Textarea value={editOrderInfo.description} onChange={e => setEditOrderInfo((p: any) => ({ ...p, description: e.target.value }))} rows={2} />
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-sm flex items-center gap-2"><Package className="h-4 w-4" /> Items ({editItems.length})</h4>
                  <Button variant="outline" size="sm" onClick={() => setShowAddItem(!showAddItem)}>
                    <Plus className="h-3 w-3 mr-1" /> Add Item
                  </Button>
                </div>

                {showAddItem && (
                  <Card className="mb-3">
                    <CardContent className="p-3 space-y-3">
                      <div className="space-y-2">
                        <Label className="text-xs">Select Product</Label>
                        <Select onValueChange={selectProduct}>
                          <SelectTrigger><SelectValue placeholder="Choose product..." /></SelectTrigger>
                          <SelectContent>
                            {products?.map(p => (
                              <SelectItem key={p.id} value={p.id}>{p.name} ({p.sku})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Product Name</Label>
                          <Input value={newItem.product_name} onChange={e => setNewItem(p => ({ ...p, product_name: e.target.value }))} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">SKU</Label>
                          <Input value={newItem.sku} onChange={e => setNewItem(p => ({ ...p, sku: e.target.value }))} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Inventory ID</Label>
                          <Input value={newItem.inventory_id} onChange={e => setNewItem(p => ({ ...p, inventory_id: e.target.value }))} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Quantity</Label>
                          <Input type="number" min={1} value={newItem.quantity} onChange={e => setNewItem(p => ({ ...p, quantity: parseInt(e.target.value) || 1 }))} />
                        </div>
                        <div className="space-y-1 col-span-2">
                          <Label className="text-xs">Specification</Label>
                          <Input value={newItem.specification} onChange={e => setNewItem(p => ({ ...p, specification: e.target.value }))} />
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" size="sm" onClick={() => setShowAddItem(false)}>Cancel</Button>
                        <Button size="sm" onClick={handleAddProduct} disabled={!newItem.product_name}>Add</Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Inventory ID</TableHead>
                      <TableHead>Spec</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {editItems.map((item, idx) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell>
                          <Input value={item.product_name} onChange={e => updateEditItem(idx, 'product_name', e.target.value)} className="h-8 text-sm" />
                        </TableCell>
                        <TableCell className="font-mono text-xs">{item.sku || '-'}</TableCell>
                        <TableCell>
                          <Input value={item.inventory_id || ''} onChange={e => updateEditItem(idx, 'inventory_id', e.target.value)} className="h-8 text-xs font-mono w-24" />
                        </TableCell>
                        <TableCell>
                          <Input value={item.specification || ''} onChange={e => updateEditItem(idx, 'specification', e.target.value)} className="h-8 text-xs" />
                        </TableCell>
                        <TableCell className="text-right">
                          <Input type="number" min={1} value={item.quantity} onChange={e => updateEditItem(idx, 'quantity', parseInt(e.target.value) || 1)} className="h-8 text-sm w-16 text-right" />
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeEditItem(idx)}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </TableCell>
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
