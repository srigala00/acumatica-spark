import { Link, useNavigate } from 'react-router-dom';
import { Search, Menu, X, User, LogOut, Phone, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const Header = () => {
  const { user, profile, signOut, isAdmin } = useAuth();
  const { cartCount } = useCart();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = () => {
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-background shadow-sm">
      {/* Top gradient bar */}
      <div className="h-1.5 bg-gradient-to-r from-primary via-primary to-[hsl(187,100%,32%)]" />

      {/* Utility bar */}
      <div className="bg-muted/50 border-b border-border">
        <div className="container mx-auto px-4 flex items-center justify-end h-8 text-xs text-muted-foreground gap-4">
          <span className="flex items-center gap-1">
            <Phone className="h-3 w-3" />
            Customer Service <a href="tel:0217246184" className="text-primary font-medium hover:underline">(021) 7246184</a>
          </span>
        </div>
      </div>

      {/* Main header */}
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20 gap-6">
          {/* Logo */}
          <Link to="/" className="shrink-0">
            <img src="/logo_pln.png" alt="PLN Suku Cadang" className="h-12 w-auto" />
          </Link>

          {/* Search */}
          <div className="flex-1 max-w-2xl hidden md:block">
            <div className="flex">
              <Input
                placeholder="Search entire store here..."
                className="rounded-r-none border-r-0 h-11 bg-background"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button
                className="rounded-l-none h-11 px-4"
                onClick={handleSearch}
              >
                <Search className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="gap-2 h-auto py-1">
                      <User className="h-5 w-5 text-muted-foreground" />
                      <div className="hidden sm:block text-left">
                        <span className="text-xs text-muted-foreground block">Welcome</span>
                        <span className="text-sm font-medium block">{profile?.full_name || 'Account'}</span>
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard">My Dashboard</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/orders">My Orders</Link>
                    </DropdownMenuItem>
                    {isAdmin && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link to="/admin">Admin Panel</Link>
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={signOut}>
                      <LogOut className="h-4 w-4 mr-2" /> Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Link to="/orders" className="hidden sm:flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                  <ShoppingCart className="h-5 w-5" />
                  <div className="text-left">
                    <span className="text-xs block">Quotation</span>
                    <span className="text-sm font-medium block">My Orders</span>
                  </div>
                </Link>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Link to="/login" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                  <User className="h-5 w-5" />
                  <div className="hidden sm:block text-left">
                    <span className="text-xs block">Sign In</span>
                    <span className="text-sm font-medium block">Create an Account</span>
                  </div>
                </Link>
              </div>
            )}

            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Navigation bar */}
      <nav className="bg-background border-t border-b border-border">
        <div className="container mx-auto px-4">
          <div className="hidden md:flex items-center gap-8 h-12 text-sm font-medium">
            <Link to="/" className="text-foreground hover:text-primary transition-colors">HOME</Link>
            <Link to="/products" className="text-foreground hover:text-primary transition-colors">PRODUCTS</Link>
            <Link to="/order" className="text-foreground hover:text-primary transition-colors">QUOTATION</Link>
            <Link to="/about" className="text-foreground hover:text-primary transition-colors">ABOUT US</Link>
            <Link to="/contact" className="text-foreground hover:text-primary transition-colors">CONTACT US</Link>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background">
          <div className="p-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { handleSearch(); setMobileOpen(false); } }}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Link to="/" className="px-3 py-2 rounded-md hover:bg-muted text-sm font-medium" onClick={() => setMobileOpen(false)}>HOME</Link>
              <Link to="/products" className="px-3 py-2 rounded-md hover:bg-muted text-sm font-medium" onClick={() => setMobileOpen(false)}>PRODUCTS</Link>
              <Link to="/order" className="px-3 py-2 rounded-md hover:bg-muted text-sm font-medium" onClick={() => setMobileOpen(false)}>QUOTATION</Link>
              <Link to="/about" className="px-3 py-2 rounded-md hover:bg-muted text-sm font-medium" onClick={() => setMobileOpen(false)}>ABOUT US</Link>
              <Link to="/contact" className="px-3 py-2 rounded-md hover:bg-muted text-sm font-medium" onClick={() => setMobileOpen(false)}>CONTACT US</Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
