import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

const HeroBanner = () => {
  return (
    <section className="relative bg-gradient-to-br from-primary/10 via-background to-accent overflow-hidden">
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 py-16 md:py-24 relative z-10">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-sm font-medium mb-6">
            <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            Trusted by 660000+ Industrial Companies
          </div>

          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-6">
            Industrial Spare Parts <span className="text-primary">Procurement</span> Made Simple
          </h1>

          <p className="text-lg text-muted-foreground mb-8 max-w-lg">
            Browse thousands of industrial spare parts from trusted brands. Submit RFQs directly and get competitive
            quotes for your procurement needs.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mb-8">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input placeholder="Search parts by name, SKU, or brand..." className="pl-11 h-12 text-base" />
            </div>
            <Button size="lg" className="h-12 px-8" asChild>
              <Link to="/products">
                Browse Catalog <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">12,000+</span> Products
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">200+</span> Brands
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">8</span> Categories
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroBanner;
