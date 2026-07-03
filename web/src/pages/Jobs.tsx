import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, MapPin, Banknote, Briefcase, ChevronLeft, ChevronRight, SlidersHorizontal, X } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

interface Job {
  id: number;
  title: string;
  department: string;
  location: string;
  category: string;
  salary_min: number;
  salary_max: number;
  description: string;
}

const PAGE_SIZE = 9;

const categoryOptions = [
  { value: "", label: "全部类别" },
  { value: "技术", label: "技术" },
  { value: "管理", label: "管理" },
  { value: "生产", label: "生产" },
  { value: "其他", label: "其他" },
];

const locationOptions = [
  { value: "", label: "全部地点" },
  { value: "北京", label: "北京" },
  { value: "唐山", label: "唐山" },
  { value: "长沙浏阳", label: "长沙浏阳" },
  { value: "其他", label: "其他" },
];

function formatSalary(min: number, max: number): string {
  if (!min && !max) return "薪资面议";
  const fmt = (n: number) => `${(n / 1000).toFixed(0)}k`;
  return min && max ? `${fmt(min)}-${fmt(max)}` : min ? `${fmt(min)}起` : `至${fmt(max)}`;
}

export default function Jobs() {
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();

  const search = searchParams.get("search") || "";
  const category = searchParams.get("category") || "";
  const location = searchParams.get("location") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);

  useEffect(() => {
    setLoading(true);
    fetch("/api/jobs")
      .then((res) => res.json())
      .then((data) => {
        if (data.data && Array.isArray(data.data.jobs)) {
          setAllJobs(data.data.jobs);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const setFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    if (key !== "page") params.delete("page");
    setSearchParams(params);
  };

  const clearAll = () => setSearchParams({});

  const filtered = allJobs.filter((job) => {
    if (search && !job.title.includes(search) && !job.description?.includes(search)) return false;
    if (category && job.category !== category) return false;
    if (location && job.location !== location) return false;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const currentPage = Math.min(Math.max(page, 1), totalPages || 1);
  const pagedJobs = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const hasFilters = search || category || location;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="pt-16">
        <div className="bg-gradient-to-b from-primary-900 to-primary-800 border-b border-white/5">
          <div className="container mx-auto px-4 py-16">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">全部岗位</h1>
            <p className="text-gray-400">找到属于你的职业舞台，共筑大国重器</p>
          </div>
        </div>

        <div className="container mx-auto px-4 -mt-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-4 md:p-6 mb-8 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setFilter("search", e.target.value)}
                  placeholder="搜索岗位名称或关键词..."
                  className="w-full h-11 pl-10 pr-4 rounded-xl border border-gray-200 bg-white text-gray-700 placeholder-gray-400 focus:outline-none transition-all"
                />
              </div>

              <select
                value={category}
                onChange={(e) => setFilter("category", e.target.value)}
                className="h-11 px-4 rounded-xl border border-gray-200 bg-white text-gray-700 focus:outline-none transition-all appearance-none cursor-pointer"
              >
                {categoryOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>

              <select
                value={location}
                onChange={(e) => setFilter("location", e.target.value)}
                className="h-11 px-4 rounded-xl border border-gray-200 bg-white text-gray-700 focus:outline-none transition-all appearance-none cursor-pointer"
              >
                {locationOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-gray-400">
                共找到 <span className="text-accent-500 font-semibold">{filtered.length}</span> 个岗位
              </p>
              {hasFilters && (
                <button
                  onClick={clearAll}
                  className="flex items-center gap-1.5 text-sm text-accent-500 hover:text-accent-600 font-medium transition-colors"
                >
                  <X className="w-4 h-4" />
                  清除筛选
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
                  <div className="w-12 h-12 bg-gray-100 rounded-xl mb-4" />
                  <div className="h-5 bg-gray-100 rounded w-3/4 mb-3" />
                  <div className="h-4 bg-gray-50 rounded w-1/2 mb-4" />
                  <div className="h-4 bg-gray-50 rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : pagedJobs.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pagedJobs.map((job) => (
                  <Link
                    key={job.id}
                    to={`/jobs/${job.id}`}
                    className="group bg-white rounded-2xl border border-gray-100 p-6 card-hover"
                  >
                    <div className="w-12 h-12 bg-gradient-to-br from-accent-50 to-orange-50 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                      <Briefcase className="w-6 h-6 text-accent-500" />
                    </div>
                    <h3 className="text-lg font-bold text-primary-800 mb-1 group-hover:text-accent-500 transition-colors">
                      {job.title}
                    </h3>
                    <p className="text-sm text-gray-400 mb-3">{job.department}</p>
                    <div className="flex items-center gap-3 text-sm text-gray-500 mb-3">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-gray-400" />
                        {job.location}
                      </span>
                      <span className="flex items-center gap-1 font-medium text-accent-600">
                        <Banknote className="w-3.5 h-3.5" />
                        {formatSalary(job.salary_min, job.salary_max)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 line-clamp-2 leading-relaxed">{job.description}</p>
                    <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
                      <span className="text-xs text-gray-300 bg-gray-50 px-2.5 py-1 rounded-md">{job.category}</span>
                      <span className="text-sm text-accent-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        查看详情 <ChevronRight className="w-4 h-4" />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-12">
                  <button
                    onClick={() => setFilter("page", String(currentPage - 1))}
                    disabled={currentPage <= 1}
                    className="p-2.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => setFilter("page", String(p))}
                      className={`w-10 h-10 rounded-xl text-sm font-semibold transition-all ${
                        p === currentPage
                          ? "bg-accent-500 text-white shadow-md shadow-accent-500/20"
                          : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    onClick={() => setFilter("page", String(currentPage + 1))}
                    disabled={currentPage >= totalPages}
                    className="p-2.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
              <Briefcase className="w-16 h-16 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-400 text-lg mb-2">暂无匹配的岗位</p>
              <p className="text-gray-300 text-sm mb-6">尝试调整筛选条件，或清除所有筛选</p>
              <button
                onClick={clearAll}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-accent-500 text-white rounded-xl font-medium hover:bg-accent-600 transition-all"
              >
                <SlidersHorizontal className="w-4 h-4" />
                清除筛选条件
              </button>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
