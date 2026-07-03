import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import { Sparkles, ChevronRight, ChevronLeft } from "lucide-react";

export default function JobForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState("");
  const [loading, setLoading] = useState(false);
  const [mcpOpen, setMcpOpen] = useState(false);
  const [mcpTitle, setMcpTitle] = useState("");
  const [mcpRequirements, setMcpRequirements] = useState("");
  const [mcpGenerating, setMcpGenerating] = useState(false);

  useEffect(() => {
    if (isEdit) {
      fetch(`/api/jobs/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("admin_token")}`,
        },
      })
        .then((res) => res.json())
        .then((data) => {
          const job = data.data?.job;
          if (job) {
            setTitle(job.title || "");
            setDepartment(job.department || "");
            setLocation(job.location || "");
            setCategory(job.category || "");
            setSalaryMin(job.salary_min?.toString() || "");
            setSalaryMax(job.salary_max?.toString() || "");
            setDescription(job.description || "");
            setRequirements(job.requirements || "");
          }
        })
        .catch(() => {});
    }
  }, [id, isEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const body = {
      title,
      department,
      location,
      category,
      salaryMin: salaryMin ? Number(salaryMin) : null,
      salaryMax: salaryMax ? Number(salaryMax) : null,
      description,
      requirements,
    };

    try {
      const url = isEdit ? `/api/jobs/${id}` : "/api/jobs";
      const method = isEdit ? "PUT" : "POST";

      await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("admin_token")}`,
        },
        body: JSON.stringify(body),
      });

      navigate("/admin/jobs");
    } catch {
      alert("保存失败");
    } finally {
      setLoading(false);
    }
  };

  const handleMcpGenerate = async () => {
    if (!mcpTitle.trim()) return;
    setMcpGenerating(true);
    try {
      const res = await fetch("/api/mcp/tool", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("admin_token")}`,
        },
        body: JSON.stringify({
          tool: "generate_job_description",
          args: {
            title: mcpTitle,
            requirements: mcpRequirements,
            department,
          },
        }),
      });
      const result = await res.json();
      const mcpResult = result.data?.result;
      if (mcpResult) {
        if (mcpResult.description) setDescription(mcpResult.description);
        if (mcpResult.requirements) setRequirements(mcpResult.requirements);
      }
    } catch {
      alert("生成失败，请重试");
    } finally {
      setMcpGenerating(false);
    }
  };

  const inputStyle =
    "w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition-colors";
  const inputFocus = {
    onFocus: (e: React.FocusEvent<HTMLInputElement>) => {
      e.currentTarget.style.borderColor = "#f97316";
      e.currentTarget.style.boxShadow = "0 0 0 2px rgba(249,115,22,0.15)";
    },
    onBlur: (e: React.FocusEvent<HTMLInputElement>) => {
      e.currentTarget.style.borderColor = "#e2e8f0";
      e.currentTarget.style.boxShadow = "none";
    },
  };

  const quillModules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ["bold", "italic", "underline", "strike"],
      [{ list: "ordered" }, { list: "bullet" }],
      ["blockquote", "code-block"],
      ["link", "clean"],
    ],
  };

  return (
    <div className="flex h-full">
      <div className="flex-1 overflow-auto p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold" style={{ color: "#1a2332" }}>
            {isEdit ? "编辑岗位" : "发布新岗位"}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="max-w-4xl space-y-6">
          <div className="rounded-xl border bg-white p-6 shadow-sm" style={{ borderColor: "#e2e8f0" }}>
            <div className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium" style={{ color: "#475569" }}>
                  岗位名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={inputStyle}
                  style={{ borderColor: "#e2e8f0", color: "#1a2332" }}
                  placeholder="例如：高级前端工程师"
                  required
                  {...inputFocus}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium" style={{ color: "#475569" }}>
                  部门
                </label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className={inputStyle}
                  style={{ borderColor: "#e2e8f0", color: "#1a2332" }}
                  placeholder="例如：技术部"
                  {...inputFocus}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium" style={{ color: "#475569" }}>
                  工作地点
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className={inputStyle}
                  style={{ borderColor: "#e2e8f0", color: "#1a2332" }}
                  placeholder="例如：北京市朝阳区"
                  {...inputFocus}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium" style={{ color: "#475569" }}>
                  类别
                </label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={inputStyle}
                  style={{ borderColor: "#e2e8f0", color: "#1a2332" }}
                  placeholder="例如：技术、产品、市场"
                  {...inputFocus}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium" style={{ color: "#475569" }}>
                  薪资范围（最低）
                </label>
                <input
                  type="number"
                  value={salaryMin}
                  onChange={(e) => setSalaryMin(e.target.value)}
                  className={inputStyle}
                  style={{ borderColor: "#e2e8f0", color: "#1a2332" }}
                  placeholder="例如：15000"
                  {...inputFocus}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium" style={{ color: "#475569" }}>
                  薪资范围（最高）
                </label>
                <input
                  type="number"
                  value={salaryMax}
                  onChange={(e) => setSalaryMax(e.target.value)}
                  className={inputStyle}
                  style={{ borderColor: "#e2e8f0", color: "#1a2332" }}
                  placeholder="例如：25000"
                  {...inputFocus}
                />
              </div>
            </div>

            <div className="mb-5">
              <label className="mb-1.5 block text-sm font-medium" style={{ color: "#475569" }}>
                岗位描述
              </label>
              <div style={{ color: "#1a2332" }}>
                <ReactQuill
                  value={description}
                  onChange={setDescription}
                  modules={quillModules}
                  placeholder="请输入岗位描述..."
                  theme="snow"
                />
              </div>
            </div>

            <div className="mb-5">
              <label className="mb-1.5 block text-sm font-medium" style={{ color: "#475569" }}>
                任职要求
              </label>
              <div style={{ color: "#1a2332" }}>
                <ReactQuill
                  value={requirements}
                  onChange={setRequirements}
                  modules={quillModules}
                  placeholder="请输入任职要求..."
                  theme="snow"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ backgroundColor: "#f97316" }}
            >
              {loading ? "保存中..." : isEdit ? "保存修改" : "发布岗位"}
            </button>
            <button
              type="button"
              onClick={() => navigate("/admin/jobs")}
              className="rounded-lg border px-6 py-2.5 text-sm font-medium transition-colors"
              style={{ borderColor: "#e2e8f0", color: "#64748b" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#f8fafc";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              取消
            </button>
          </div>
        </form>
      </div>

      <button
        onClick={() => setMcpOpen(!mcpOpen)}
        className="flex items-center gap-1 px-3 text-white transition-colors"
        style={{ backgroundColor: mcpOpen ? "#1a2332" : "#f97316" }}
        title="MCP 智能助手"
      >
        {mcpOpen ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
      </button>

      {mcpOpen && (
        <div className="w-80 border-l overflow-auto" style={{ backgroundColor: "#f8fafc", borderColor: "#e2e8f0" }}>
          <div className="border-b px-5 py-4" style={{ borderColor: "#e2e8f0" }}>
            <h3 className="flex items-center gap-2 text-sm font-semibold" style={{ color: "#1a2332" }}>
              <Sparkles size={16} style={{ color: "#f97316" }} />
              MCP 智能助手
            </h3>
          </div>

          <div className="p-5 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium" style={{ color: "#475569" }}>
                岗位名称
              </label>
              <input
                type="text"
                value={mcpTitle}
                onChange={(e) => setMcpTitle(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-xs outline-none"
                style={{ borderColor: "#e2e8f0", color: "#1a2332" }}
                placeholder="输入岗位名称"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium" style={{ color: "#475569" }}>
                关键要求
              </label>
              <textarea
                value={mcpRequirements}
                onChange={(e) => setMcpRequirements(e.target.value)}
                rows={4}
                className="w-full rounded-lg border px-3 py-2 text-xs outline-none resize-none"
                style={{ borderColor: "#e2e8f0", color: "#1a2332" }}
                placeholder="描述关键技能和经验要求..."
              />
            </div>

            <button
              onClick={handleMcpGenerate}
              disabled={mcpGenerating || !mcpTitle.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ backgroundColor: "#f97316" }}
            >
              <Sparkles size={14} />
              {mcpGenerating ? "生成中..." : "生成岗位描述"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
