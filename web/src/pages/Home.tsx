import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Cog, Shield, Users, MapPin, Banknote, Briefcase, ArrowRight, Sparkles } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

interface Job {
  id: number;
  title: string;
  department: string;
  location: string;
  salary_min: number;
  salary_max: number;
  tags: string[];
}

const advantages = [
  {
    icon: Cog,
    title: "技术创新",
    description: "拥有国家级技术研发中心，累计获得专利500余项，持续引领重工行业技术变革与产业升级。",
    gradient: "from-blue-600 to-cyan-500",
  },
  {
    icon: Shield,
    title: "行业领先",
    description: "中国重型装备制造行业龙头企业，产品远销全球50多个国家和地区，市场占有率连续十年行业第一。",
    gradient: "from-accent-500 to-orange-600",
  },
  {
    icon: Users,
    title: "人才培养",
    description: "建立完善的人才培养体系，提供多元化职业发展通道，让每一位员工与企业共同成长。",
    gradient: "from-emerald-500 to-teal-500",
  },
];

function formatSalary(min: number, max: number): string {
  if (!min && !max) return "薪资面议";
  const fmt = (n: number) => `${(n / 1000).toFixed(0)}k`;
  return min && max ? `${fmt(min)}-${fmt(max)}` : min ? `${fmt(min)}起` : `至${fmt(max)}`;
}

export default function Home() {
  const [hotJobs, setHotJobs] = useState<Job[]>([]);
  const [searchKeyword, setSearchKeyword] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetch("/api/jobs")
      .then((res) => res.json())
      .then((data) => {
        if (data.data && Array.isArray(data.data.jobs)) {
          setHotJobs(data.data.jobs.slice(0, 4));
        }
      })
      .catch(() => {});
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchKeyword.trim()) {
      navigate(`/jobs?search=${encodeURIComponent(searchKeyword.trim())}`);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-primary-900">
        <div className="absolute inset-0 hero-grid" />
        <div className="absolute inset-0 hero-glow" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "2s" }} />
        <div className="absolute top-1/3 right-1/3 w-64 h-64 bg-accent-500/5 rounded-full blur-3xl animate-float" />

        <div className="absolute top-20 left-10 w-20 h-20 border border-white/5 rounded-full animate-float" />
        <div className="absolute bottom-40 right-16 w-12 h-12 border border-white/5 rounded-full animate-float-delayed" />
        <div className="absolute top-1/2 right-10 w-8 h-8 bg-accent-500/10 rounded-lg rotate-45 animate-float" />

        <div className="relative z-10 container mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-accent-500/30 bg-accent-500/10 text-accent-400 text-sm font-medium mb-8 animate-fade-in-up">
            <span className="w-2 h-2 bg-accent-500 rounded-full animate-pulse" />
            五新重工 2025 年度社会招聘正式启动
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white leading-tight mb-6 tracking-tight animate-fade-in-up stagger-1">
            加入五新重工
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-400 via-accent-500 to-orange-400">
              筑造大国重器
            </span>
          </h1>

          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in-up stagger-2">
            五新重工集团——中国重型装备制造业的领航者，国家级高新技术企业
            <br />
            诚邀有志之士加盟，共同书写中国重工的辉煌篇章
          </p>

          <form onSubmit={handleSearch} className="max-w-xl mx-auto animate-fade-in-up stagger-3">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-accent-500/30 to-accent-600/30 rounded-xl blur-lg opacity-0 group-focus-within:opacity-100 transition-opacity duration-300" />
              <div className="relative flex">
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  placeholder="搜索岗位关键词..."
                  className="w-full h-14 pl-12 pr-36 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-lg focus:outline-none focus:border-accent-500/50 focus:bg-white/[0.08] transition-all"
                />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2.5 bg-accent-500 hover:bg-accent-600 text-white font-medium rounded-lg transition-all hover:shadow-lg hover:shadow-accent-500/25 active:scale-95"
                >
                  搜索岗位
                </button>
              </div>
            </div>
          </form>

          <div className="flex items-center justify-center gap-6 mt-8 text-sm text-gray-500 animate-fade-in-up stagger-4">
            <span>热门搜索：</span>
            {["机械工程师", "电气工程师", "项目经理", "焊接技师"].map((tag, i) => (
              <button
                key={tag}
                onClick={() => navigate(`/jobs?search=${encodeURIComponent(tag)}`)}
                className="text-gray-400 hover:text-accent-400 transition-colors relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-px after:bg-accent-400 after:transition-all hover:after:w-full"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-gray-600 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-gray-500 rounded-full mt-2 animate-[slide-down_1.5s_ease-in-out_infinite]" />
          </div>
        </div>
      </section>

      <section className="py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <span className="text-accent-500 font-semibold text-sm tracking-widest uppercase">热招职位</span>
            <h2 className="text-3xl md:text-4xl font-bold text-primary-800 mt-3 mb-4">热门职位</h2>
            <div className="w-20 h-1 bg-gradient-to-r from-accent-500 to-accent-300 mx-auto rounded-full" />
            <p className="text-gray-500 mt-4 max-w-lg mx-auto">发现适合你的职业机会，与五新重工共创未来</p>
          </div>

          {hotJobs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {hotJobs.map((job, i) => (
                <Link
                  key={job.id}
                  to={`/jobs/${job.id}`}
                  className="group bg-white rounded-2xl border border-gray-100 p-6 card-hover"
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-accent-50 to-orange-50 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <Briefcase className="w-6 h-6 text-accent-500" />
                  </div>
                  <h3 className="text-lg font-bold text-primary-800 mb-1 group-hover:text-accent-500 transition-colors line-clamp-1">
                    {job.title}
                  </h3>
                  <p className="text-sm text-gray-400 mb-3">{job.department}</p>
                  <div className="flex items-center gap-3 text-sm text-gray-500 mb-4">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-gray-400" />
                      {job.location}
                    </span>
                    <span className="flex items-center gap-1 font-medium text-accent-600">
                      <Banknote className="w-3.5 h-3.5" />
                      {formatSalary(job.salary_min, job.salary_max)}
                    </span>
                  </div>
                  <div className="flex items-center text-sm text-accent-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>查看详情</span>
                    <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <Briefcase className="w-12 h-12 mx-auto mb-4 text-gray-200" />
              暂无热门职位数据
            </div>
          )}

          <div className="text-center mt-10">
            <Link
              to="/jobs"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-primary-800 text-white font-semibold rounded-xl hover:bg-primary-700 transition-all hover:shadow-lg hover:shadow-primary-800/20 group"
            >
              查看全部岗位
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      <section className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <span className="text-accent-500 font-semibold text-sm tracking-widest uppercase">Why Choose Us</span>
            <h2 className="text-3xl md:text-4xl font-bold text-primary-800 mt-3 mb-4">企业优势</h2>
            <div className="w-20 h-1 bg-gradient-to-r from-accent-500 to-accent-300 mx-auto rounded-full" />
            <p className="text-gray-500 mt-4">为什么选择五新重工</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {advantages.map((item, index) => {
              const Icon = item.icon;
              return (
                <div
                  key={index}
                  className="group relative text-center p-8 md:p-10 rounded-2xl border border-gray-100 hover:border-transparent transition-all duration-500"
                  style={{ animationDelay: `${index * 0.15}s` }}
                >
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white to-gray-50 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-transparent via-transparent to-accent-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                  <div className="relative z-10">
                    <div className={`w-20 h-20 bg-gradient-to-br ${item.gradient} rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 group-hover:shadow-xl transition-all duration-500`}>
                      <Icon className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-primary-800 mb-3 group-hover:text-accent-500 transition-colors">{item.title}</h3>
                    <p className="text-gray-500 leading-relaxed">{item.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-24 bg-gradient-to-b from-primary-900 to-primary-800 relative overflow-hidden">
        <div className="absolute inset-0 hero-grid opacity-30" />
        <div className="container mx-auto px-4 text-center relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">准备好加入我们了吗？</h2>
          <p className="text-gray-400 mb-8 max-w-lg mx-auto">立即查看开放岗位，找到属于你的职业舞台</p>
          <Link
            to="/jobs"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-accent-500 hover:bg-accent-600 text-white font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-accent-500/25 group"
          >
            <Sparkles className="w-5 h-5" />
            浏览全部岗位
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
