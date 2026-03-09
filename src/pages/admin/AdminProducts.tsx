import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/layout/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Upload } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import * as XLSX from 'xlsx';

const formatPrice = (price: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(price);

interface ProductRow {
  sku: string;
  name: string;
  brand: string;
  category: string;
  description: string;
  estimated_price: string;
}

const AdminProducts = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editProduct, setEditProduct] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importData, setImportData] = useState<ProductRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await supabase.from('categories').select('*').order('sort_order');
      return data || [];
    },
  });

  const { data: products } = useQuery({
    queryKey: ['admin-products'],
    queryFn: async () => {
      const { data } = await supabase.from('products').select('*, categories(name)').order('name');
      return data || [];
    },
  });

  const [form, setForm] = useState({
    sku: '', name: '', brand: '', category_id: '', description: '', estimated_price: '', is_active: true,
  });

  const resetForm = () => {
    setForm({ sku: '', name: '', brand: '', category_id: '', description: '', estimated_price: '', is_active: true });
    setEditProduct(null);
  };

  const openEdit = (p: any) => {
    setEditProduct(p);
    setForm({
      sku: p.sku, name: p.name, brand: p.brand || '', category_id: p.category_id || '',
      description: p.description || '', estimated_price: p.estimated_price?.toString() || '', is_active: p.is_active,
    });
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        sku: form.sku, name: form.name, brand: form.brand || null,
        category_id: form.category_id || null, description: form.description || null,
        estimated_price: form.estimated_price ? parseFloat(form.estimated_price) : null,
        is_active: form.is_active,
      };
      if (editProduct) {
        const { error } = await supabase.from('products').update(payload).eq('id', editProduct.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('products').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast({ title: editProduct ? 'Product updated' : 'Product created' });
      setDialogOpen(false);
      resetForm();
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target?.result, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json<ProductRow>(ws);
      setImportData(data.map(r => ({
        sku: String(r.sku || '').trim(),
        name: String(r.name || '').trim(),
        brand: String(r.brand || '').trim(),
        category: String(r.category || '').trim(),
        description: String(r.description || '').trim(),
        estimated_price: String(r.estimated_price || '').trim(),
      })));
    };
    reader.readAsBinaryString(file);
  };

  const handleImport = async () => {
    if (!categories) return;
    setImporting(true);
    setImportProgress(0);

    const categoryMap = new Map(categories.map(c => [c.name.toLowerCase(), c.id]));
    const rows = importData.map(r => ({
      sku: r.sku,
      name: r.name,
      brand: r.brand || null,
      category_id: categoryMap.get(r.category.toLowerCase()) || null,
      description: r.description || null,
      estimated_price: r.estimated_price ? parseFloat(r.estimated_price) : null,
    })).filter(r => r.sku && r.name);

    // Batch insert in chunks of 50
    let success = 0;
    let errors = 0;
    const chunkSize = 50;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const { error } = await supabase.from('products').insert(chunk);
      if (error) errors += chunk.length;
      else success += chunk.length;
      setImportProgress(Math.round(((i + chunk.length) / rows.length) * 100));
    }

    toast({ title: 'Import complete', description: `${success} created, ${errors} failed` });
    setImporting(false);
    setImportOpen(false);
    setImportData([]);
    queryClient.invalidateQueries({ queryKey: ['admin-products'] });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold">Products</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4 mr-2" /> Import Products
            </Button>
            <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" /> Add Product</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{editProduct ? 'Edit Product' : 'Add Product'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>SKU *</Label>
                      <Input required value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Brand</Label>
                      <Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Name *</Label>
                    <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {categories?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Est. Price (IDR)</Label>
                      <Input type="number" value={form.estimated_price} onChange={(e) => setForm({ ...form, estimated_price: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                  </div>
                  <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? 'Saving...' : 'Save Product'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products?.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{p.brand}</TableCell>
                    <TableCell>{(p.categories as any)?.name || '-'}</TableCell>
                    <TableCell>{p.estimated_price ? formatPrice(p.estimated_price) : '-'}</TableCell>
                    <TableCell>
                      <Badge variant={p.is_active ? 'default' : 'secondary'}>
                        {p.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Import Dialog */}
        <Dialog open={importOpen} onOpenChange={(o) => { if (!importing) { setImportOpen(o); if (!o) setImportData([]); } }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Import Products</DialogTitle>
              <DialogDescription>Upload an Excel file with columns: sku, name, brand, category, description, estimated_price</DialogDescription>
            </DialogHeader>
            {importData.length === 0 ? (
              <Input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} />
            ) : (
              <div className="space-y-4">
                <div className="max-h-64 overflow-auto rounded border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>SKU</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Brand</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Price</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importData.map((r, i) => (
                        <TableRow key={i}>
                          <TableCell>{r.sku}</TableCell>
                          <TableCell>{r.name}</TableCell>
                          <TableCell>{r.brand}</TableCell>
                          <TableCell>{r.category}</TableCell>
                          <TableCell>{r.estimated_price}</TableCell>
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
                    {importing ? `Importing... ${importProgress}%` : `Import ${importData.length} Products`}
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

export default AdminProducts;
