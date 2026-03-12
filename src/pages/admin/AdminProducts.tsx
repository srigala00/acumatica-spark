import { useState, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/layout/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Upload, Download, Trash2, ImageIcon, X } from 'lucide-react';
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
  inventory_id: string;
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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const allSelected = useMemo(() => {
    if (!products?.length) return false;
    return products.every(p => selectedIds.includes(p.id));
  }, [products, selectedIds]);

  const toggleSelectAll = () => {
    if (allSelected) setSelectedIds([]);
    else setSelectedIds(products?.map(p => p.id) || []);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const [form, setForm] = useState({
    sku: '', name: '', brand: '', category_id: '', description: '', estimated_price: '', is_active: true, inventory_id: '',
  });

  const resetForm = () => {
    setForm({ sku: '', name: '', brand: '', category_id: '', description: '', estimated_price: '', is_active: true, inventory_id: '' });
    setEditProduct(null);
    setImageFile(null);
    setImagePreview(null);
  };

  const openEdit = (p: any) => {
    setEditProduct(p);
    setForm({
      sku: p.sku, name: p.name, brand: p.brand || '', category_id: p.category_id || '',
      description: p.description || '', estimated_price: p.estimated_price?.toString() || '', is_active: p.is_active,
      inventory_id: p.inventory_id || '',
    });
    setImagePreview(p.image_url || null);
    setImageFile(null);
    setDialogOpen(true);
  };

  const uploadImage = async (productId: string): Promise<string | null> => {
    if (!imageFile) return editProduct?.image_url || null;
    setUploadingImage(true);
    const ext = imageFile.name.split('.').pop();
    const filePath = `${productId}.${ext}`;
    
    const { error } = await supabase.storage.from('product-images').upload(filePath, imageFile, { upsert: true });
    setUploadingImage(false);
    if (error) {
      toast({ title: 'Image upload failed', description: error.message, variant: 'destructive' });
      return editProduct?.image_url || null;
    }
    const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(filePath);
    return urlData.publicUrl + '?t=' + Date.now();
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        sku: form.sku, name: form.name, brand: form.brand || null,
        category_id: form.category_id || null, description: form.description || null,
        estimated_price: form.estimated_price ? parseFloat(form.estimated_price) : null,
        is_active: form.is_active,
        inventory_id: form.inventory_id || null,
      };

      if (editProduct) {
        const imageUrl = await uploadImage(editProduct.id);
        payload.image_url = imageUrl;
        const { error } = await supabase.from('products').update(payload).eq('id', editProduct.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('products').insert(payload).select().single();
        if (error) throw error;
        if (imageFile && data) {
          const imageUrl = await uploadImage(data.id);
          await supabase.from('products').update({ image_url: imageUrl }).eq('id', data.id);
        }
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

  const deleteSelected = async () => {
    try {
      const { error } = await supabase.from('products').delete().in('id', selectedIds);
      if (error) throw error;
      toast({ title: 'Products deleted', description: `${selectedIds.length} product(s) removed` });
      setSelectedIds([]);
      setDeleteOpen(false);
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([['sku', 'name', 'brand', 'category', 'description', 'estimated_price', 'inventory_id']]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Products');
    XLSX.writeFile(wb, 'product_import_template.xlsx');
  };

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
        inventory_id: String(r.inventory_id || '').trim(),
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
      inventory_id: r.inventory_id || null,
    })).filter(r => r.sku && r.name);

    let success = 0;
    let errors = 0;
    const chunkSize = 50;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const { error } = await supabase.from('products').upsert(chunk as any, { onConflict: 'sku' });
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
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editProduct ? 'Edit Product' : 'Add Product'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-4">
                  {/* Image upload */}
                  <div className="space-y-2">
                    <Label>Product Image</Label>
                    {imagePreview ? (
                      <div className="relative w-full h-40 rounded-lg overflow-hidden bg-muted">
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                        <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={removeImage}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div
                        className="w-full h-32 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
                        <span className="text-sm text-muted-foreground">Click to upload image</span>
                      </div>
                    )}
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                  </div>

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
                    <Label>Inventory ID</Label>
                    <Input value={form.inventory_id} onChange={(e) => setForm({ ...form, inventory_id: e.target.value })} placeholder="Internal inventory reference" />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                  </div>
                  <Button type="submit" className="w-full" disabled={saveMutation.isPending || uploadingImage}>
                    {saveMutation.isPending || uploadingImage ? 'Saving...' : 'Save Product'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {selectedIds.length > 0 && (
          <div className="flex items-center gap-4 rounded-lg border bg-muted/50 p-3">
            <span className="text-sm font-medium">{selectedIds.length} product(s) selected</span>
            <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="mr-2 h-4 w-4" /> Delete Selected
            </Button>
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
                  <TableHead className="w-16">Image</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Inventory ID</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products?.map(p => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Checkbox checked={selectedIds.includes(p.id)} onCheckedChange={() => toggleSelect(p.id)} />
                    </TableCell>
                    <TableCell>
                      <div className="w-10 h-10 rounded bg-muted flex items-center justify-center overflow-hidden">
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{p.brand}</TableCell>
                    <TableCell>{(p.categories as any)?.name || '-'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{(p as any).inventory_id || '-'}</TableCell>
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

        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {selectedIds.length} product(s)?</AlertDialogTitle>
              <AlertDialogDescription>This action cannot be undone. The selected products will be permanently removed.</AlertDialogDescription>
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
              <DialogTitle>Import Products</DialogTitle>
              <DialogDescription>Upload an Excel file with columns: sku, name, brand, category, description, estimated_price, inventory_id</DialogDescription>
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
                        <TableHead>SKU</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Brand</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Inv. ID</TableHead>
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
                          <TableCell>{r.inventory_id}</TableCell>
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
