import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { MapPin, Banknote, Briefcase, Clock, CheckCircle, Send, ArrowLeft, Building2, GraduationCap, Award, Loader2, Paperclip, X, FileText } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

interface Job {
  id: number;
  title: string;
  department: string;
  location: string;
  salary_min: number;
  salary_max: number;
  description: string;
  requirements: string;
  category: string;
}

interface FormData {
  name: string;
  phone: string;
  email: string;
  education: string;
  experience: string;
  coverLetter: string;
}

interface UploadedFile {
  id: number;
  original_name: string;
  file_name: string;
  file_size: number;
}

const initialForm: FormData = {
  name: "",
  phone: "",
  email: "",
  education: "",
  experience: "",
  coverLetter: "",
};

function formatSalary(min: number, max: number): string {
  if (!min && !max) return "薪资面议";
  const fmt = (n: number) => `${(n / 1000).toFixed(0)}k`;
  if (min && max) {
    return `${fmt(min)} — ${fmt(max)}`;
  }
  return min ? `≥ ${fmt(min)}` : `≤ ${fmt(max)}`;
}

export default function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormData>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Partial<FormData> & {submit?: string}>({});
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/jobs/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.data && data.data.job) setJob(data.data.job);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const validate = (): boolean => {
    const errs: Partial<FormData> = {};
    if (!form.name.trim()) errs.name = "请输入姓名";
    if (!form.phone.trim()) errs.phone = "请输入电话";
    else if (!/^1\d{10}$/.test(form.phone.trim())) errs.phone = "请输入正确的手机号";
    if (!form.email.trim()) errs.email = "请输入邮箱";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errs.email = "请输入正确的邮箱";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setErrors({});
    try {
      const body: Record<string, any> = { jobId: id, ...form };
      if (uploadedFile) body.resumeFileId = uploadedFile.id;
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await res.json();
      if (result.success) {
        setSubmitted(true);
      } else {
        setErrors((prev) => ({ ...prev, submit: result.error || "投递失败，请重试" }));
      }
    } catch {
      setErrors((prev) => ({ ...prev, submit: "网络错误，请稍后重试" }));
    } finally {
      setSubmitting(false);
    }
  };

  const updateField = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body: formData });
      const result = await res.json();
      if (result.data?.resumeFile) {
        setUploadedFile(result.data.resumeFile);
      }
    } catch {
      alert("文件上传失败");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeFile = () => {
    setUploadedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const inputClass = (field: keyof FormData) =>
    `w-full h-11 px-4 rounded-xl border text-sm focus:outline-none transition-all ${
      errors[field] ? "border-red-300 focus:border-red-400" : "border-gray-200"
    }`;

  const textareaClass = (field: keyof FormData) =>
    `w-full px-4 py-3 rounded-xl border text-sm focus:outline-none transition-all resize-none ${
      errors[field] ? "border-red-300" : "border-gray-200"
    }`;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="pt-16 flex items-center justify-center min-h-[80vh]">
          <Loader2 className="w-8 h-8 text-accent-500 animate-spin" />
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="pt-16 flex items-center justify-center min-h-[80vh]">
          <div className="text-center">
            <div className="w-24 h-24 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Briefcase className="w-12 h-12 text-gray-300" />
            </div>
            <h2 className="text-2xl font-bold text-primary-800 mb-2">岗位不存在</h2>
            <p className="text-gray-400 mb-8">该岗位可能已下架或地址有误</p>
            <Link to="/jobs" className="inline-flex items-center gap-2 px-6 py-3 bg-primary-800 text-white font-semibold rounded-xl hover:bg-primary-700 transition-all">
              <ArrowLeft className="w-4 h-4" />
              返回岗位列表
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="pt-16 flex items-center justify-center min-h-[80vh]">
          <div className="text-center max-w-md mx-auto px-4 animate-scale-in">
            <div className="w-24 h-24 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-primary-800 mb-2">投递成功！</h2>
            <p className="text-gray-500 mb-2">
              您已成功投递 <span className="font-semibold text-accent-500">{job.title}</span>
            </p>
            <p className="text-gray-400 text-sm mb-8">我们将在 3-5 个工作日内通过邮件或电话与您联系</p>
            <div className="flex items-center justify-center gap-4">
              <Link to="/jobs" className="px-6 py-3 bg-primary-800 text-white font-semibold rounded-xl hover:bg-primary-700 transition-all">继续浏览岗位</Link>
              <Link to="/" className="px-6 py-3 border border-gray-200 text-gray-600 font-medium rounded-xl hover:bg-gray-50 transition-all">返回首页</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="pt-16">
        <div className="bg-white border-b border-gray-100">
          <div className="container mx-auto px-4 py-4">
            <Link to="/jobs" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-accent-500 transition-colors group">
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              返回岗位列表
            </Link>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8 shadow-sm">
                <div className="flex items-start gap-5 mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-accent-50 to-orange-50 rounded-2xl flex items-center justify-center shrink-0">
                    <Briefcase className="w-8 h-8 text-accent-500" />
                  </div>
                  <div className="flex-1">
                    <h1 className="text-2xl md:text-3xl font-bold text-primary-800 mb-1">{job.title}</h1>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-gray-400">{job.department}</span>
                      <span className="text-gray-200">|</span>
                      <span className="text-gray-400">{job.category}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 md:gap-6 mb-6 pb-6 border-b border-gray-50">
                  <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg">
                    <MapPin className="w-4 h-4 text-accent-500" />
                    <span className="text-sm text-gray-600">{job.location}</span>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-accent-50 rounded-lg">
                    <Banknote className="w-4 h-4 text-accent-500" />
                    <span className="text-sm font-semibold text-accent-600">{formatSalary(job.salary_min, job.salary_max)}</span>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg">
                    <Clock className="w-4 h-4 text-accent-500" />
                    <span className="text-sm text-gray-600">全职</span>
                  </div>
                </div>

                <div className="space-y-8">
                  <div>
                    <h3 className="flex items-center gap-2 text-lg font-bold text-primary-800 mb-4">
                      <Award className="w-5 h-5 text-accent-500" />
                      岗位描述
                    </h3>
                    <div className="text-gray-600 leading-relaxed whitespace-pre-line pl-7 border-l-2 border-accent-100">
                      {job.description}
                    </div>
                  </div>

                  {job.requirements && (
                    <div>
                      <h3 className="flex items-center gap-2 text-lg font-bold text-primary-800 mb-4">
                        <GraduationCap className="w-5 h-5 text-accent-500" />
                        任职要求
                      </h3>
                      <div className="text-gray-600 leading-relaxed whitespace-pre-line pl-7 border-l-2 border-primary-100">
                        {job.requirements}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm sticky top-24" style={{ top: "7rem" }}>
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-50">
                  <div className="w-10 h-10 bg-accent-50 rounded-xl flex items-center justify-center">
                    <Send className="w-5 h-5 text-accent-500" />
                  </div>
                  <h3 className="text-lg font-bold text-primary-800">投递简历</h3>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {[
                    { field: "name" as keyof FormData, label: "姓名 *", type: "text", placeholder: "请输入姓名" },
                    { field: "phone" as keyof FormData, label: "电话 *", type: "text", placeholder: "请输入手机号" },
                    { field: "email" as keyof FormData, label: "邮箱 *", type: "email", placeholder: "请输入邮箱" },
                  ].map(({ field, label, type, placeholder }) => (
                    <div key={field}>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5">{label}</label>
                      <input
                        type={type}
                        value={form[field]}
                        onChange={(e) => updateField(field, e.target.value)}
                        placeholder={placeholder}
                        className={inputClass(field)}
                      />
                      {errors[field] && <p className="text-xs text-red-500 mt-1">{errors[field]}</p>}
                    </div>
                  ))}

                  {[
                    { field: "education" as keyof FormData, label: "教育经历", placeholder: "请描述您的教育背景（学校、专业、学历等）" },
                    { field: "experience" as keyof FormData, label: "工作经验", placeholder: "请描述您的工作经历" },
                    { field: "coverLetter" as keyof FormData, label: "求职信", placeholder: "请简要说明您为什么适合这个岗位" },
                  ].map(({ field, label, placeholder }) => (
                    <div key={field}>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5">{label}</label>
                      <textarea
                        value={form[field]}
                        onChange={(e) => updateField(field, e.target.value)}
                        placeholder={placeholder}
                        rows={2}
                        className={textareaClass(field)}
                      />
                    </div>
                  ))}

                  <div className="mb-4">
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">附件简历 (选填)</label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-all disabled:opacity-50"
                      >
                        {uploading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Paperclip className="w-4 h-4 text-gray-400" />
                        )}
                        {uploading ? "上传中..." : "选择文件"}
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.doc,.docx,.jpg,.png,.txt"
                        onChange={handleFileUpload}
                        className="fixed -top-full left-0 opacity-0 pointer-events-none"
                      />
                      {uploadedFile && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                          <FileText className="w-4 h-4 text-accent-500" />
                          <span className="text-xs text-gray-600 truncate max-w-[140px]">{uploadedFile.original_name}</span>
                          <button type="button" onClick={removeFile} className="text-gray-400 hover:text-red-500 transition-colors">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {errors.submit && (
                    <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
                      {errors.submit}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-accent-500 to-accent-600 text-white font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-accent-500/25 disabled:opacity-60 active:scale-[0.98]"
                  >
                    {submitting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        立即投递
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
