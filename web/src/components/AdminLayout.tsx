import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { LayoutDashboard, Briefcase, FileText, LogOut } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { useEffect } from "react";

const menuItems = [
  { path: "/admin", label: "仪表盘", icon: LayoutDashboard },
  { path: "/admin/jobs", label: "岗位管理", icon: Briefcase },
  { path: "/admin/applications", label: "投递管理", icon: FileText },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, username, logout, checkAuth } = useAuthStore();

  useEffect(() => { checkAuth(); }, [checkAuth]);

  useEffect(() => {
    if (!isAuthenticated) navigate("/admin/login", { replace: true });
  }, [isAuthenticated, navigate]);

  const handleLogout = () => {
    logout();
    navigate("/admin/login", { replace: true });
  };

  if (!isAuthenticated) return null;

  const isActive = (path: string) =>
    path === "/admin" ? location.pathname === "/admin" : location.pathname.startsWith(path);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      <aside className="w-60 flex flex-col shrink-0 bg-primary-800">
        <div className="flex items-center gap-3 px-6 py-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-accent-500 to-accent-600 shadow-lg shadow-accent-500/20">
            <span className="text-lg font-bold text-white">五</span>
          </div>
          <div>
            <h1 className="text-base font-bold text-white">五新重工</h1>
            <p className="text-xs text-slate-400">管理后台</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {menuItems.map((item) => {
            const active = isActive(item.path);
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                  active
                    ? "bg-accent-500/15 text-accent-400 shadow-sm"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                }`}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="border-t border-white/5 px-3 py-4 space-y-2">
          <div className="px-4 text-sm text-slate-400 truncate">
            {username || "管理员"}
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200"
          >
            <LogOut size={20} />
            <span>退出登录</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto bg-slate-50">
        <Outlet />
      </main>
    </div>
  );
}
