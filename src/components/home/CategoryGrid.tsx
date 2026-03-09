import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Flame, Zap, Fan, Gauge, Cable, Activity, ShieldCheck, Package, LucideIcon } from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  Flame, Zap, Fan, Gauge, Cable, Activity, ShieldCheck, Package,
};

const CategoryGrid = () => {
  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="font-display text-3xl font-bold text-center mb-10">Browse by Category</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-lg" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <h2 className="font-display text-3xl font-bold text-center mb-2">Browse by Category</h2>
        <p className="text-muted-foreground text-center mb-10">Find the parts you need across our industrial categories</p>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {categories?.map((cat) => {
            const Icon = iconMap[cat.icon || ''] || Package;
            return (
              <Link key={cat.id} to={`/products?category=${cat.slug}`}>
                <Card className="group hover:border-primary hover:shadow-lg transition-all duration-200 cursor-pointer h-full">
                  <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                    <div className="w-14 h-14 rounded-xl bg-accent flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <Icon className="h-7 w-7" />
                    </div>
                    <h3 className="font-display font-semibold text-sm">{cat.name}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2">{cat.description}</p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default CategoryGrid;
