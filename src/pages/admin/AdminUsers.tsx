import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/layout/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Upload, Trash2, Download, Save, Pencil } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import * as XLSX from 'xlsx';

interface UserRow {
  full_name: string;
  email: string;
  phone: string;
  password: string;
  role: string;
  business_account: string;
  location: string;
  unit: string;
  company_name: string;
}

const AdminUsers = () => {
  const { toast } = useToast();
  const { hasRole } = useAuth();
  const isSuperAdmin = hasRole('super_admin');
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', password: '', role: 'buyer', business_account: '', location: '', unit: '', company_name: '' });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importData, setImportData] = useState<UserRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [pendingStatus, setPendingStatus] = useState<Map<string, string>>(new Map());
  const [savingStatus, setSavingStatus] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [editForm, setEditForm] = useState({ full_name: '', phone: '', business_account: '', location: '', unit: '', role: '', email: '', company_name: '' });

  const { data: users } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data: profiles } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      const { data: roles } = await supabase.from('user_roles').select('*');
      return (profiles || []).map(p => ({
        ...p,
        roles: (roles || []).filter(r => r.user_id === p.user_id).map(r => r.role),
      }));
    },
  });

  const allSelected = useMemo(() => {
    if (!users?.length) return false;
    return users.every(u => selectedIds.includes(u.user_id));
  }, [users, selectedIds]);

  const toggleSelectAll = () => {
    if (allSelected) setSelectedIds([]);
    else setSelectedIds(users?.map(u => u.user_id) || []);
  };

  const toggleSelect = (userId: string) => {
    setSelectedIds(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name || !form.email || !form.password || !form.role) {
      toast({ title: 'Error', description: 'Please fill all required fields', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const res = await supabase.functions.invoke('create-user', {
        body: {
          email: form.email, password: form.password, full_name: form.full_name,
          phone: form.phone || null, role: form.role,
          business_account: form.business_account || null, location: form.location || null,
          unit: form.unit || null, company_name: form.company_name || null,
        },
      });
      if (res.error || res.data?.error) throw new Error(res.data?.error || res.error?.message || 'Failed');
      toast({ title: 'Success', description: 'User created successfully' });
      setOpen(false);
      setForm({ full_name: '', email: '', phone: '', password: '', role: 'buyer', business_account: '', location: '', unit: '', company_name: '' });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (user: any) => {
    setEditUser(user);
    setEditForm({
      full_name: user.full_name || '',
      phone: user.phone || '',
      business_account: user.business_account || '',
      location: user.location || '',
      unit: (user as any).unit || '',
      role: user.roles?.[0] || 'buyer',
      email: '',
      company_name: (user as any).company_name || '',
    });
    setEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    setEditLoading(true);
    try {
      const body: any = {
        action: 'update_profile',
        user_id: editUser.user_id,
        full_name: editForm.full_name,
        phone: editForm.phone || null,
        business_account: editForm.business_account || null,
        location: editForm.location || null,
        unit: editForm.unit || null,
        company_name: editForm.company_name || null,
      };
      if (isSuperAdmin && editForm.role && editForm.role !== editUser.roles?.[0]) {
        body.role = editForm.role;
      }
      if (editForm.email) {
        body.email = editForm.email;
      }
      const res = await supabase.functions.invoke('manage-user', { body });
      if (res.error || res.data?.error) throw new Error(res.data?.error || res.error?.message || 'Failed');
      toast({ title: 'Success', description: 'User updated successfully' });
      setEditOpen(false);
      setEditUser(null);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setEditLoading(false);
    }
  };

  const getDisplayStatus = (user: any) => pendingStatus.get(user.user_id) || user.status;

  const handleStatusChange = (userId: string, newStatus: string, currentStatus: string) => {
    if (newStatus === currentStatus) {
      setPendingStatus(prev => { const m = new Map(prev); m.delete(userId); return m; });
    } else {
      setPendingStatus(prev => new Map(prev).set(userId, newStatus));
    }
  };

  const saveStatusChanges = async () => {
    setSavingStatus(true);
    let success = 0;
    let errors = 0;
    for (const [userId, status] of pendingStatus) {
      try {
        const res = await supabase.functions.invoke('manage-user', {
          body: { action: 'update_status', user_id: userId, status },
        });
        if (res.error || res.data?.error) throw new Error(res.data?.error || res.error?.message);
        success++;
      } catch {
        errors++;
      }
    }
    if (errors > 0) {
      toast({ title: 'Partial success', description: `${success} updated, ${errors} failed`, variant: 'destructive' });
    } else {
      toast({ title: 'Status updated', description: `${success} user(s) updated` });
    }
    setPendingStatus(new Map());
    setSavingStatus(false);
    queryClient.invalidateQueries({ queryKey: ['admin-users'] });
  };

  const deleteSelected = async () => {
    try {
      const res = await supabase.functions.invoke('manage-user', {
        body: { action: 'delete', user_ids: selectedIds },
      });
      if (res.error) throw new Error(res.error.message);
      if (res.data?.errors?.length) {
        toast({ title: 'Partial success', description: `${res.data.errors.length} errors occurred`, variant: 'destructive' });
      } else {
        toast({ title: 'Users deleted', description: `${selectedIds.length} user(s) removed` });
      }
      setSelectedIds([]);
      setDeleteOpen(false);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([['full_name', 'email', 'phone', 'password', 'role', 'business_account', 'location', 'unit', 'company_name']]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Users');
    XLSX.writeFile(wb, 'user_import_template.xlsx');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target?.result, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json<UserRow>(ws);
      setImportData(data.map(r => ({
        full_name: String(r.full_name || '').trim(),
        email: String(r.email || '').trim(),
        phone: String(r.phone || '').trim(),
        password: String(r.password || '').trim(),
        role: String(r.role || 'buyer').trim(),
        business_account: String(r.business_account || '').trim(),
        location: String(r.location || '').trim(),
        unit: String(r.unit || '').trim(),
        company_name: String((r as any).company_name || '').trim(),
      })));
    };
    reader.readAsBinaryString(file);
  };

  const handleImport = async () => {
    setImporting(true);
    setImportProgress(0);
    let success = 0;
    let errors = 0;
    for (let i = 0; i < importData.length; i++) {
      const row = importData[i];
      try {
        const res = await supabase.functions.invoke('create-user', {
          body: {
            email: row.email, password: row.password, full_name: row.full_name,
            phone: row.phone || null, role: row.role,
            business_account: row.business_account || null, location: row.location || null,
            unit: row.unit || null, company_name: row.company_name || null,
          },
        });
        if (res.error || res.data?.error) throw new Error('fail');
        success++;
      } catch {
        errors++;
      }
      setImportProgress(Math.round(((i + 1) / importData.length) * 100));
    }
    toast({ title: 'Import complete', description: `${success} created, ${errors} failed` });
    setImporting(false);
    setImportOpen(false);
    setImportData([]);
    queryClient.invalidateQueries({ queryKey: ['admin-users'] });
  };

  const roleBadgeVariant = (role: string) => {
    switch (role) {
      case 'super_admin': return 'destructive' as const;
      case 'sales': return 'default' as const;
      default: return 'outline' as const;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold">Users</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="mr-2 h-4 w-4" /> Import Users
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" /> Add User</Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New User</DialogTitle>
                  <DialogDescription>Create a new user account with an assigned role.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name *</Label>
                    <Input id="full_name" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input id="email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password *</Label>
                    <Input id="password" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required minLength={6} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role *</Label>
                    <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="buyer">Buyer</SelectItem>
                        <SelectItem value="sales">Sales</SelectItem>
                        <SelectItem value="super_admin">Super Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company_name">Company Name</Label>
                    <Input id="company_name" value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} placeholder="Company name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="business_account">Business Account</Label>
                    <Input id="business_account" value={form.business_account} onChange={e => setForm(f => ({ ...f, business_account: e.target.value }))} placeholder="Business account identifier" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input id="location" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="User location" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unit">Unit</Label>
                    <Input id="unit" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} placeholder="Unit / department" />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Creating...' : 'Create User'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {(selectedIds.length > 0 || pendingStatus.size > 0) && (
          <div className="flex items-center gap-4 rounded-lg border bg-muted/50 p-3">
            {selectedIds.length > 0 && (
              <>
                <span className="text-sm font-medium">{selectedIds.length} user(s) selected</span>
                <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete Selected
                </Button>
              </>
            )}
            {pendingStatus.size > 0 && (
              <>
                {selectedIds.length > 0 && <div className="h-4 w-px bg-border" />}
                <span className="text-sm font-medium">{pendingStatus.size} status change(s) pending</span>
                <Button size="sm" onClick={saveStatusChanges} disabled={savingStatus}>
                  <Save className="mr-2 h-4 w-4" /> {savingStatus ? 'Saving...' : 'Save Changes'}
                </Button>
              </>
            )}
          </div>
        )}

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Business Account</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users?.map(u => {
                  const displayStatus = getDisplayStatus(u);
                  const isPending = pendingStatus.has(u.user_id);
                  return (
                    <TableRow key={u.id} className={isPending ? 'bg-accent/30' : ''}>
                      <TableCell>
                        <Checkbox checked={selectedIds.includes(u.user_id)} onCheckedChange={() => toggleSelect(u.user_id)} />
                      </TableCell>
                      <TableCell className="font-medium">{u.full_name}</TableCell>
                      <TableCell>{u.phone || '-'}</TableCell>
                      <TableCell className="text-sm">{(u as any).unit || '-'}</TableCell>
                      <TableCell className="text-sm">{u.business_account || '-'}</TableCell>
                      <TableCell className="text-sm">{u.location || '-'}</TableCell>
                      <TableCell>
                        <Select value={displayStatus} onValueChange={(v) => handleStatusChange(u.user_id, v, u.status)}>
                          <SelectTrigger className="w-28 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {u.roles?.map((r: string) => (
                          <Badge key={r} variant={roleBadgeVariant(r)} className="mr-1">{r}</Badge>
                        ))}
                      </TableCell>
                      <TableCell className="text-sm">{new Date(u.created_at).toLocaleDateString('id-ID')}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(u)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Edit User Dialog */}
        <Dialog open={editOpen} onOpenChange={(o) => { setEditOpen(o); if (!o) setEditUser(null); }}>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>Update user information.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input value={editForm.full_name} onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Input value={editForm.unit} onChange={e => setEditForm(f => ({ ...f, unit: e.target.value }))} placeholder="Unit / department" />
              </div>
              <div className="space-y-2">
                <Label>Business Account</Label>
                <Input value={editForm.business_account} onChange={e => setEditForm(f => ({ ...f, business_account: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input value={editForm.location} onChange={e => setEditForm(f => ({ ...f, location: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Change Email (leave blank to keep current)</Label>
                <Input type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} placeholder="New email address" />
              </div>
              {isSuperAdmin && (
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={editForm.role} onValueChange={v => setEditForm(f => ({ ...f, role: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="buyer">Buyer</SelectItem>
                      <SelectItem value="sales">Sales</SelectItem>
                      <SelectItem value="super_admin">Super Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Button type="submit" className="w-full" disabled={editLoading}>
                {editLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {selectedIds.length} user(s)?</AlertDialogTitle>
              <AlertDialogDescription>This action cannot be undone. The users and all their data will be permanently removed.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={deleteSelected} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={importOpen} onOpenChange={(o) => { if (!importing) { setImportOpen(o); if (!o) setImportData([]); } }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Import Users</DialogTitle>
              <DialogDescription>Upload an Excel file with columns: full_name, email, phone, password, role, business_account, location, unit</DialogDescription>
            </DialogHeader>
            {importData.length === 0 ? (
              <div className="space-y-4">
                <Button variant="outline" size="sm" onClick={downloadTemplate}>
                  <Download className="mr-2 h-4 w-4" /> Download Template
                </Button>
                <Input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="max-h-64 overflow-auto rounded border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>Biz Account</TableHead>
                        <TableHead>Location</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importData.map((r, i) => (
                        <TableRow key={i}>
                          <TableCell>{r.full_name}</TableCell>
                          <TableCell>{r.email}</TableCell>
                          <TableCell>{r.phone}</TableCell>
                          <TableCell>{r.role}</TableCell>
                          <TableCell>{r.unit}</TableCell>
                          <TableCell>{r.business_account}</TableCell>
                          <TableCell>{r.location}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <p className="text-sm text-muted-foreground">{importData.length} rows found</p>
                {importing && <Progress value={importProgress} />}
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setImportData([])} disabled={importing}>Back</Button>
                  <Button onClick={handleImport} disabled={importing}>
                    {importing ? `Importing... ${importProgress}%` : `Import ${importData.length} Users`}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminUsers;
