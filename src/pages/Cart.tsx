import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import PublicLayout from '@/components/layout/PublicLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Send, ShoppingCart, Minus, Plus, Package, ArrowLeft } from 'lucide-react';

const formatPrice = (price: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(price);

const Cart = () => {
  const { user, profile } = useAuth();
  const { items, removeFromCart, updateQuantity, updateSpecification, clearCart } = useCart();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [form, setForm] = useState({
    companyName: '',
    contactPerson: '',
    email: '',
    phone: '',
    description: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile) setForm(prev => ({ ...prev, contactPerson: profile.full_name, phone: profile.phone || '' }));
    if (user) setForm(prev => ({ ...prev, email: user.email || '' }));
  }, [profile, user]);

  const estimatedTotal = items.reduce((sum, i) => sum + (i.estimated_price || 0) * i.quantity, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { navigate('/login'); return; }
    if (items.length === 0) {
      toast({ title: 'Cart is empty', description: 'Please add products before submitting.', variant: 'destructive' });
      return;
    }
    setLoading(true);

    const { data: request, error: reqErr } = await supabase
      .from('requests')
      .insert({
        user_id: user.id,
        company_name: form.companyName,
        contact_person: form.contactPerson,
        email: form.email,
        phone: form.phone,
        description: form.description,
        request_number: 'TEMP',
      } as any)
      .select()
      .single();

    if (reqErr || !request) {
      toast({ title: 'Error', description: reqErr?.message || 'Failed to create order', variant: 'destructive' });
      setLoading(false);
      return;
    }

    const itemsToInsert = items.map(i => ({
      request_id: request.id,
      product_id: i.product_id || null,
      product_name: i.name,
      sku: i.sku || null,
      quantity: i.quantity,
      specification: i.specification || null,
    }));

    await supabase.from('request_items').insert(itemsToInsert);

    clearCart();
    setLoading(false);
    toast({ title: 'Order Submitted!', description: `Your order ${request.request_number} has been submitted successfully.` });
    navigate('/orders');
  };

  if (items.length === 0) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-16 text-center">
          <ShoppingCart className="h-20 w-20 text-muted-foreground/30 mx-auto mb-4" />
          <h2 className="font-display text-2xl font-bold mb-2">Your Cart is Empty</h2>
          <p className="text-muted-foreground mb-6">Browse our products and add items to your cart.</p>
          <Button asChild><Link to="/products">Browse Products</Link></Button>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="bg-muted/30 py-4 border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-primary">Home</Link>
            <span>/</span>
            <span className="text-foreground font-medium">Cart</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" /> Continue Shopping
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            <h1 className="font-display text-2xl font-bold mb-4">Shopping Cart ({items.length} items)</h1>
            {items.map(item => (
              <Card key={item.product_id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="object-cover w-full h-full" />
                      ) : (
                        <Package className="h-8 w-8 text-muted-foreground/30" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs text-primary font-medium">{item.brand}</p>
                          <h3 className="font-semibold text-sm">{item.name}</h3>
                          <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
                        </div>
                        <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-destructive" onClick={() => removeFromCart(item.product_id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-1">
                          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.product_id, item.quantity - 1)} disabled={item.quantity <= 1}>
                            <Minus className="h-3 w-3" />
                          </Button>
                          <Input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) => updateQuantity(item.product_id, parseInt(e.target.value) || 1)}
                            className="w-16 h-8 text-center"
                          />
                          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.product_id, item.quantity + 1)}>
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        {item.estimated_price ? (
                          <p className="font-display font-bold text-primary">{formatPrice(item.estimated_price * item.quantity)}</p>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">Price on request</p>
                        )}
                      </div>
                      <div className="mt-2">
                        <Input
                          placeholder="Specification / notes (optional)"
                          value={item.specification}
                          onChange={(e) => updateSpecification(item.product_id, e.target.value)}
                          className="text-sm h-8"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Order Summary & Form */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Items</span>
                  <span className="font-medium">{items.reduce((s, i) => s + i.quantity, 0)}</span>
                </div>
                {estimatedTotal > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Estimated Total</span>
                    <span className="font-display font-bold text-primary">{formatPrice(estimatedTotal)}</span>
                  </div>
                )}
                <p className="text-xs text-muted-foreground pt-2 border-t border-border">
                  Final pricing will be confirmed after order review.
                </p>
              </CardContent>
            </Card>

            <form onSubmit={handleSubmit}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Company Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Company Name *</Label>
                    <Input required value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Contact Person *</Label>
                    <Input required value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Email *</Label>
                    <Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Phone</Label>
                    <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Notes</Label>
                    <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Additional requirements..." rows={3} />
                  </div>
                  <Button type="submit" size="lg" className="w-full mt-2" disabled={loading}>
                    <Send className="h-4 w-4 mr-2" /> {loading ? 'Submitting...' : 'Submit Order'}
                  </Button>
                </CardContent>
              </Card>
            </form>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};

export default Cart;
