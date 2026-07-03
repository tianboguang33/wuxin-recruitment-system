import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Edit2, Trash2, Eye, EyeOff } from "lucide-react";

interface Job {
  id: number;
  title: string;
  department: string;
  location: string;
  status: string;
}

export default function JobList() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);

  const token = () => localStorage.getItem("admin_token");

  const fetchJobs = () => {
    fetch("/api/jobs")
      .then((res) => res.json())
      .then((data) => {
        if (data.data && Array.isArray(data.data.jobs)) {
          setJobs(data.data.jobs);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleToggleStatus = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "closed" : "active";
    try {
      await fetch(`/api/jobs/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchJobs();
    } catch {}
  };

  const handleDelete = async (id: number) => {
    if (!confirm("确定要删除这个岗位吗？")) return;
    try {
      await fetch(`/api/jobs/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token()}`,
        },
      });
      fetchJobs();
    } catch {}
  };

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: "#1a2332" }}>
          岗位管理
        </h1>
        <button
          onClick={() => navigate("/admin/jobs/new")}
          className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#f97316" }}
        >
          <Plus size={18} />
          发布新岗位
        </button>
      </div>

      <div className="rounded-xl border bg-white shadow-sm" style={{ borderColor: "#e2e8f0" }}>
        <table className="w-full">
          <thead>
            <tr className="border-b text-left text-sm" style={{ borderColor: "#e2e8f0", color: "#94a3b8" }}>
              <th className="px-6 py-4 font-medium">序号</th>
              <th className="px-6 py-4 font-medium">岗位名称</th>
              <th className="px-6 py-4 font-medium">部门</th>
              <th className="px-6 py-4 font-medium">地点</th>
              <th className="px-6 py-4 font-medium">状态</th>
              <th className="px-6 py-4 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job, index) => (
              <tr key={job.id} className="border-b text-sm" style={{ borderColor: "#f1f5f9" }}>
                <td className="px-6 py-4" style={{ color: "#94a3b8" }}>
                  {index + 1}
                </td>
                <td className="px-6 py-4 font-medium" style={{ color: "#1a2332" }}>
                  {job.title}
                </td>
                <td className="px-6 py-4" style={{ color: "#475569" }}>
                  {job.department}
                </td>
                <td className="px-6 py-4" style={{ color: "#475569" }}>
                  {job.location}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
                      job.status === "active"
                        ? "bg-green-50 text-green-700"
                        : "bg-gray-50 text-gray-500"
                    }`}
                  >
                    {job.status === "active" ? "已上架" : "已下架"}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate(`/admin/jobs/${job.id}/edit`)}
                      className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                      style={{ color: "#3b82f6" }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "rgba(59,130,246,0.08)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      <Edit2 size={14} />
                      编辑
                    </button>
                    <button
                      onClick={() => handleToggleStatus(job.id, job.status)}
                      className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                      style={{ color: "#f97316" }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "rgba(249,115,22,0.08)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      {job.status === "active" ? <EyeOff size={14} /> : <Eye size={14} />}
                      {job.status === "active" ? "下架" : "上架"}
                    </button>
                    <button
                      onClick={() => handleDelete(job.id)}
                      className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                      style={{ color: "#ef4444" }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "rgba(239,68,68,0.08)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      <Trash2 size={14} />
                      删除
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {jobs.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-sm" style={{ color: "#94a3b8" }}>
                  暂无岗位数据
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
