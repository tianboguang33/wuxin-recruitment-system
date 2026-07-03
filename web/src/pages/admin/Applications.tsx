import { useState, useEffect } from "react";
import { Filter, Trash2, RefreshCw, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Application {
  id: number;
  name: string;
  phone: string;
  email: string;
  job_title?: string;
  job_id?: number;
  status: string;
  created_at: string;
  updated_at?: string;
}

interface Job {
  id: number;
  title: string;
}

const statusOptions = [
  { value: "pending", label: "待审核", color: "yellow" },
  { value: "screening", label: "初筛中", color: "blue" },
  { value: "screened", label: "初筛通过", color: "blue" },
  { value: "screening_rejected", label: "初筛淘汰", color: "gray" },
  { value: "interviewing", label: "面试中", color: "purple" },
  { value: "interview_passed", label: "面试通过", color: "green" },
  { value: "interview_failed", label: "面试未通过", color: "gray" },
  { value: "offer_sent", label: "已发Offer", color: "green" },
  { value: "accepted", label: "已录用", color: "green" },
  { value: "declined", label: "已放弃", color: "gray" },
  { value: "rejected", label: "已淘汰", color: "gray" },
];

const statusStyle = (status: string) => {
  const map: Record<string, string> = {
    pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
    screening: "bg-blue-50 text-blue-700 border-blue-200",
    screened: "bg-blue-50 text-blue-700 border-blue-200",
    screening_rejected: "bg-gray-50 text-gray-600 border-gray-200",
    interviewing: "bg-purple-50 text-purple-700 border-purple-200",
    interview_passed: "bg-green-50 text-green-700 border-green-200",
    interview_failed: "bg-gray-50 text-gray-600 border-gray-200",
    offer_sent: "bg-green-50 text-green-700 border-green-200",
    accepted: "bg-green-50 text-green-700 border-green-200",
    declined: "bg-gray-50 text-gray-600 border-gray-200",
    rejected: "bg-gray-50 text-gray-600 border-gray-200",
  };
  return map[status] || "bg-gray-50 text-gray-600 border-gray-200";
};

export default function Applications() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const navigate = useNavigate();

  const token = () => localStorage.getItem("admin_token");

  const fetchApplications = (jobId?: string, status?: string) => {
    const params = new URLSearchParams();
    if (jobId) params.append("jobId", jobId);
    if (status) params.append("status", status);
    const query = params.toString() ? `?${params.toString()}` : "";
    fetch(`/api/applications${query}`, {
      headers: {
        Authorization: `Bearer ${token()}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.data && Array.isArray(data.data.applications)) {
          setApplications(data.data.applications);
        } else if (Array.isArray(data)) {
          setApplications(data);
        }
      })
      .catch(() => {});
  };

  const handleStatusFilter = (status: string) => {
    setSelectedStatus(status);
    fetchApplications(selectedJobId || undefined, status || undefined);
  };

  const handleClearRejected = async () => {
    if (!confirm("确定要删除所有已淘汰的简历吗？此操作不可恢复！")) return;
    try {
      const res = await fetch(`/api/applications/mcp/rejected`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify({ apiKey: "wuxin_mcp_2026", days: 0 }),
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        fetchApplications(selectedJobId || undefined, selectedStatus || undefined);
      }
    } catch (err) {
      alert("删除失败");
    }
  };

  useEffect(() => {
    fetch("/api/jobs")
      .then((res) => res.json())
      .then((data) => {
        if (data.data && Array.isArray(data.data.jobs)) {
          setJobs(data.data.jobs);
        }
      })
      .catch(() => {});
    fetchApplications();
  }, []);

  const handleJobFilter = (jobId: string) => {
    setSelectedJobId(jobId);
    fetchApplications(jobId || undefined, selectedStatus || undefined);
  };

  const handleStatusUpdate = async (id: number, status: string) => {
    try {
      await fetch(`/api/applications/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify({ status }),
      });
      fetchApplications(selectedJobId || undefined, selectedStatus || undefined);
    } catch {}
  };

  const getStatusLabel = (value: string) => {
    return statusOptions.find((s) => s.value === value)?.label || value;
  };

  // 统计各状态简历数量
  const statusCounts = applications.reduce((acc, app) => {
    acc[app.status] = (acc[app.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: "#1a2332" }}>
          投递管理
        </h1>
        <button
          onClick={handleClearRejected}
          className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-100"
        >
          <Trash2 size={16} />
          清理已淘汰简历
        </button>
      </div>

      {/* 状态统计卡片 */}
      <div className="mb-6 flex gap-3">
        {statusOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => handleStatusFilter(opt.value === selectedStatus ? "" : opt.value)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              selectedStatus === opt.value
                ? "ring-2 ring-offset-2 " + `ring-${opt.color}-400`
                : ""
            } ${statusStyle(opt.value)}`}
          >
            {opt.label}: {statusCounts[opt.value] || 0}
          </button>
        ))}
      </div>

      <div className="mb-6 flex items-center gap-3 rounded-xl border bg-white px-5 py-3 shadow-sm" style={{ borderColor: "#e2e8f0" }}>
        <Filter size={18} style={{ color: "#94a3b8" }} />
        <select
          value={selectedJobId}
          onChange={(e) => handleJobFilter(e.target.value)}
          className="flex-1 rounded-lg border px-4 py-2 text-sm outline-none"
          style={{ borderColor: "#e2e8f0", color: "#1a2332" }}
        >
          <option value="">全部岗位</option>
          {jobs.map((job) => (
            <option key={job.id} value={job.id}>
              {job.title}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-xl border bg-white shadow-sm" style={{ borderColor: "#e2e8f0" }}>
        <table className="w-full">
          <thead>
            <tr className="border-b text-left text-sm" style={{ borderColor: "#e2e8f0", color: "#94a3b8" }}>
              <th className="px-6 py-4 font-medium">候选人</th>
              <th className="px-6 py-4 font-medium">电话</th>
              <th className="px-6 py-4 font-medium">邮箱</th>
              <th className="px-6 py-4 font-medium">投递岗位</th>
              <th className="px-6 py-4 font-medium">投递时间</th>
              <th className="px-6 py-4 font-medium">状态</th>
              <th className="px-6 py-4 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {applications.map((app) => (
              <tr key={app.id} className="border-b text-sm" style={{ borderColor: "#f1f5f9" }}>
                <td className="px-6 py-4 font-medium" style={{ color: "#1a2332" }}>
                  {app.name}
                </td>
                <td className="px-6 py-4" style={{ color: "#475569" }}>
                  {app.phone}
                </td>
                <td className="px-6 py-4" style={{ color: "#475569" }}>
                  {app.email}
                </td>
                <td className="px-6 py-4" style={{ color: "#475569" }}>
                  {app.job_title || `岗位 #${app.job_id}`}
                </td>
                <td className="px-6 py-4" style={{ color: "#94a3b8" }}>
                  {app.created_at}
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${statusStyle(app.status)}`}>
                    {getStatusLabel(app.status)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate(`/admin/applications/${app.id}`)}
                      className="flex items-center gap-1 rounded-lg border px-2 py-1 text-xs text-blue-600 transition-colors hover:bg-blue-50"
                      style={{ borderColor: "#bfdbfe" }}
                    >
                      <Eye size={14} />
                      详情
                    </button>
                    <select
                      value={app.status}
                      onChange={(e) => handleStatusUpdate(app.id, e.target.value)}
                      className="rounded-lg border px-3 py-1.5 text-xs outline-none transition-colors"
                      style={{ borderColor: "#e2e8f0", color: "#1a2332" }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = "#f97316";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = "#e2e8f0";
                      }}
                    >
                      {statusOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </td>
              </tr>
            ))}
            {applications.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-sm" style={{ color: "#94a3b8" }}>
                  暂无投递记录
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
