import PublicLayout from '@/components/layout/PublicLayout';
import HeroBanner from '@/components/home/HeroBanner';
import CategoryGrid from '@/components/home/CategoryGrid';
import FeaturedProducts from '@/components/home/FeaturedProducts';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { FileText, Truck, ShieldCheck, Headphones } from 'lucide-react';

const features = [
  { icon: FileText, title: 'Easy RFQ Submission', desc: 'Submit quotation requests in minutes with our streamlined form.' },
  { icon: Truck, title: 'Reliable Supply Chain', desc: 'Connected to trusted manufacturers and distributors worldwide.' },
  { icon: ShieldCheck, title: 'Quality Assured', desc: 'All products verified with technical specifications and certifications.' },
  { icon: Headphones, title: 'Dedicated Support', desc: 'Our procurement team assists you from request to delivery.' },
];

const Index = () => {
  return (
    <PublicLayout>
      <HeroBanner />
      <CategoryGrid />
      <FeaturedProducts />

      {/* Features Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="font-display text-3xl font-bold text-center mb-2">Why Choose Us</h2>
          <p className="text-muted-foreground text-center mb-10">Streamlined procurement for industrial operations</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f) => (
              <div key={f.title} className="text-center p-6">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <f.icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-display font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-lg opacity-90 mb-8 max-w-md mx-auto">
            Register your company account and start submitting quotation requests today.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" variant="secondary" asChild>
              <Link to="/register">Create Account</Link>
            </Button>
            <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10" asChild>
              <Link to="/products">Browse Products</Link>
            </Button>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
};

export default Index;
