import { Link } from "react-router-dom";
import { Building2, Phone, Mail, MapPin, ArrowUpRight } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-primary-900 text-gray-400 border-t border-white/5">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-3 mb-4 group">
              <div className="w-10 h-10 bg-gradient-to-br from-accent-500 to-accent-600 rounded-lg flex items-center justify-center group-hover:shadow-lg group-hover:shadow-accent-500/20 transition-all">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-xl font-bold text-white tracking-wider">五新重工</span>
                <span className="text-xs text-accent-400 ml-2 font-medium">招聘</span>
              </div>
            </Link>
            <p className="text-sm leading-relaxed text-gray-500 max-w-md">
              五新重工集团有限公司，致力于重型装备制造与技术创新，
              为国家和行业提供优质的重工产品与解决方案。
              我们诚邀天下英才，共筑大国重器。
            </p>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-5 text-sm uppercase tracking-wider">快速链接</h3>
            <ul className="space-y-3">
              {[
                { to: "/jobs", label: "全部岗位" },
                { to: "/about", label: "关于我们" },
                { to: "/admin/login", label: "管理入口" },
              ].map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="flex items-center gap-1 text-sm text-gray-500 hover:text-accent-400 transition-colors group"
                  >
                    <span>{link.label}</span>
                    <ArrowUpRight className="w-3 h-3 opacity-0 -translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-5 text-sm uppercase tracking-wider">联系我们</h3>
            <ul className="space-y-4">
              {[
                { icon: Phone, text: "010-8888-8888" },
                { icon: Mail, text: "hr@wuxinheavy.com" },
                { icon: MapPin, text: "北京市经济技术开发区重工大道1号" },
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-gray-500">
                  <item.icon className="w-4 h-4 text-accent-500 shrink-0 mt-0.5" />
                  <span>{item.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-white/5 mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-600">
            &copy; {new Date().getFullYear()} 五新重工集团有限公司. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-xs text-gray-600">
            <span className="hover:text-gray-400 cursor-pointer transition-colors">隐私政策</span>
            <span className="hover:text-gray-400 cursor-pointer transition-colors">服务条款</span>
            <span className="hover:text-gray-400 cursor-pointer transition-colors">网站地图</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
