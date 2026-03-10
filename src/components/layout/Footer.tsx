import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-foreground text-background">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-display font-bold text-sm">SP</span>
              </div>
            </div>
            <p className="text-sm opacity-70">
              Your trusted B2B marketplace for industrial spare parts and equipment procurement.
            </p>
          </div>

          <div>
            <h4 className="font-display font-semibold mb-4">Products</h4>
            <ul className="space-y-2 text-sm opacity-70">
              <li>
                <Link to="/products?category=boiler-parts" className="hover:opacity-100">
                  Boiler Parts
                </Link>
              </li>
              <li>
                <Link to="/products?category=generator-parts" className="hover:opacity-100">
                  Generator Parts
                </Link>
              </li>
              <li>
                <Link to="/products?category=turbine-parts" className="hover:opacity-100">
                  Turbine Parts
                </Link>
              </li>
              <li>
                <Link to="/products?category=pumps-compressors" className="hover:opacity-100">
                  Pumps & Compressors
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-sm opacity-70">
              <li>
                <Link to="/about" className="hover:opacity-100">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:opacity-100">
                  Contact
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:opacity-100">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:opacity-100">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-semibold mb-4">Support</h4>
            <ul className="space-y-2 text-sm opacity-70">
              <li>Email: support@spareparts.mart</li>
              <li>Phone: +62 21 1234 5678</li>
              <li>Mon - Fri, 08:00 - 17:00 WIB</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-background/20 mt-8 pt-8 text-center text-sm opacity-50">
          © {new Date().getFullYear()} SpareParts.mart. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
