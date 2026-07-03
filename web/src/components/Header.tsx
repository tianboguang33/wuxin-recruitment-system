import { Link, useLocation } from "react-router-dom";
import { Building2, Settings, Menu, X } from "lucide-react";
import { useState } from "react";

const navLinks = [
  { path: "/", label: "首页" },
  { path: "/jobs", label: "全部岗位" },
  { path: "/about", label: "关于我们" },
];

export default function Header() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-primary-800/90 backdrop-blur-lg border-b border-white/10">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link to="/" className="flex items-center gap-3 group" onClick={() => setMobileOpen(false)}>
          <div className="w-10 h-10 bg-gradient-to-br from-accent-500 to-accent-600 rounded-lg flex items-center justify-center group-hover:shadow-lg group-hover:shadow-accent-500/30 transition-all duration-300">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="text-xl font-bold text-white tracking-wider">五新重工</span>
            <span className="text-xs text-accent-400 ml-2 font-medium">招聘</span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-accent-500/15 text-accent-400"
                    : "text-gray-300 hover:text-white hover:bg-white/5"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <div className="w-px h-6 bg-white/10 mx-2" />
          <Link
            to="/admin/login"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all duration-200 border border-white/10 hover:border-accent-500/30"
          >
            <Settings className="w-4 h-4" />
            <span>管理入口</span>
          </Link>
        </nav>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2 text-gray-300 hover:text-white transition-colors"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-primary-800/95 backdrop-blur-lg border-t border-white/10 animate-slide-down">
          <div className="container mx-auto px-4 py-4 space-y-2">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileOpen(false)}
                  className={`block px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    isActive ? "bg-accent-500/15 text-accent-400" : "text-gray-300 hover:bg-white/5"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            <Link
              to="/admin/login"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 border border-white/10"
            >
              <Settings className="w-4 h-4" />
              <span>管理入口</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
