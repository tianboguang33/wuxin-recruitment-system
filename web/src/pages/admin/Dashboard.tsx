import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/auth";
import { useNavigate } from "react-router-dom";
import { Briefcase, SendHorizonal, TrendingUp, Loader2 } from "lucide-react";

interface DashboardData {
  totalJobs: number;
  totalApplications: number;
  monthlyNew: number;
  recentApplications: Array<{
    id: number;
    candidateName: string;
    jobTitle: string;
    status: string;
    createdAt: string;
  }>;
}

const statusConfig: Record<string, { label: string; style: string }> = {
  pending: { label: "待审核", style: "bg-amber-50 text-amber-700 border-amber-200" },
  reviewed: { label: "已查看", style: "bg-blue-50 text-blue-700 border-blue-200" },
  interviewed: { label: "已面试", style: "bg-purple-50 text-purple-700 border-purple-200" },
  accepted: { label: "已录用", style: "bg-green-50 text-green-700 border-green-200" },
  rejected: { label: "已淘汰", style: "bg-gray-50 text-gray-600 border-gray-200" },
};

export default function Dashboard() {
  const { username, logout } = useAuthStore();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch("/api/stats/dashboard", {
      headers: { Authorization: `Bearer ${localStorage.getItem("admin_token")}` },
    })
      .then((res) => res.json())
      .then((result) => {
        if (result.data) setData(result.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const statsCards = [
    { label: "岗位总数", value: data?.totalJobs ?? 0, icon: Briefcase, color: "#f97316", bg: "bg-orange-50" },
    { label: "投递总数", value: data?.totalApplications ?? 0, icon: SendHorizonal, color: "#3b82f6", bg: "bg-blue-50" },
    { label: "本月新增", value: data?.monthlyNew ?? 0, icon: TrendingUp, color: "#22c55e", bg: "bg-green-50" },
  ];

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-primary-800">
          欢迎回来，{username || "管理员"}
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          这里是五新重工招聘管理后台
        </p>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-3">
        {statsCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 duration-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-400">{card.label}</p>
                  <p className="mt-2 text-3xl font-bold text-primary-800">
                    {loading ? <Loader2 className="w-6 h-6 animate-spin text-slate-300" /> : card.value}
                  </p>
                </div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${card.bg}`}>
                  <Icon size={24} style={{ color: card.color }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-5">
          <h2 className="text-base font-semibold text-primary-800">最新投递</h2>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
            </div>
          ) : data?.recentApplications && data.recentApplications.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-sm text-slate-400">
                    <th className="pb-3 pr-4 font-medium">候选人</th>
                    <th className="pb-3 pr-4 font-medium">岗位</th>
                    <th className="pb-3 pr-4 font-medium">状态</th>
                    <th className="pb-3 font-medium">时间</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentApplications.map((app) => {
                    const status = statusConfig[app.status] || { label: app.status, style: "bg-gray-50 text-gray-600" };
                    return (
                      <tr key={app.id} className="border-b border-slate-50 text-sm">
                        <td className="py-3.5 pr-4 font-medium text-primary-800">{app.candidateName}</td>
                        <td className="py-3.5 pr-4 text-slate-500">{app.jobTitle}</td>
                        <td className="py-3.5 pr-4">
                          <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium border ${status.style}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="py-3.5 text-slate-400 text-xs">{app.createdAt}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center text-sm text-slate-400">
              <SendHorizonal className="w-10 h-10 mx-auto mb-3 text-slate-200" />
              暂无投递记录
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
