import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Calendar as CalendarIcon, Clock, CheckCircle, Send } from "lucide-react";
import Header from "../components/Header";

interface ApplicationInfo {
  id: number;
  candidateName: string;
  jobTitle: string;
  status: string;
  invitationSentAt: string | null;
  availableSlots: string[];
}

export default function CandidateTimeSelect() {
  const { applicationId } = useParams<{ applicationId: string }>();
  const [appInfo, setAppInfo] = useState<ApplicationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [interviewLink, setInterviewLink] = useState("");

  useEffect(() => {
    if (!applicationId) return;
    fetch(`/api/interview/time-select/${applicationId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setAppInfo(data.application);
        } else {
          setError(data.error || "获取信息失败");
        }
      })
      .catch(() => setError("网络错误"))
      .finally(() => setLoading(false));
  }, [applicationId]);

  const handleSubmit = async () => {
    if (!selectedTime) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch("/api/interview/time-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId: parseInt(applicationId!, 10),
          scheduledTime: selectedTime,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
        setInterviewLink(data.interviewLink || "");
      } else {
        setSubmitError(data.error || "提交失败");
      }
    } catch {
      setSubmitError("网络错误，请重试");
    } finally {
      setSubmitting(false);
    }
  };

  const formatSlot = (iso: string) => {
    const d = new Date(iso);
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const hour = d.getHours().toString().padStart(2, "0");
    const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
    const wd = weekdays[d.getDay()];
    return { date: `${month}月${day}日 ${wd}`, time: `${hour}:00` };
  };

  const isSelected = (iso: string) => selectedTime === iso;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="w-8 h-8 border-4 border-accent-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !appInfo) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-lg mx-auto px-4 pt-24 text-center">
          <div className="bg-red-50 rounded-2xl p-8 border border-red-100">
            <p className="text-red-600 mb-4">{error || "信息不存在"}</p>
            <Link to="/jobs" className="text-accent-500 hover:underline text-sm">返回岗位列表</Link>
          </div>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-lg mx-auto px-4 pt-24">
          <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm text-center">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="text-xl font-bold text-primary-800 mb-2">面试时间已确认！</h2>
            <p className="text-gray-500 mb-4">
              您好 <span className="font-semibold">{appInfo.candidateName}</span>，
              您已成功选择面试时间。
            </p>
            <p className="text-sm text-gray-400 mb-4">
              面试岗位：<span className="font-medium">{appInfo.jobTitle}</span>
            </p>
            <p className="text-sm text-gray-400 mb-6">
              面试时间：<span className="font-medium">{formatSlot(selectedTime).date} {formatSlot(selectedTime).time}</span>
            </p>
            {interviewLink && (
              <p className="text-sm text-gray-500">
                面试链接将在面试开始前生效，届时请点击
                <a href={interviewLink} className="text-accent-500 underline ml-1">此处</a>
                进入面试房间。
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 按日期分组
  const groupedByDate: Record<string, typeof appInfo.availableSlots> = {};
  appInfo.availableSlots.forEach((iso) => {
    const d = new Date(iso);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (!groupedByDate[key]) groupedByDate[key] = [];
    groupedByDate[key].push(iso);
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-2xl mx-auto px-4 pt-24 pb-12">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-accent-50 rounded-xl flex items-center justify-center">
              <CalendarIcon className="w-5 h-5 text-accent-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-primary-800">选择面试时间</h2>
              <p className="text-sm text-gray-400">
                {appInfo.candidateName} · {appInfo.jobTitle}
              </p>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            {Object.entries(groupedByDate).map(([dateKey, slots]) => {
              const d = new Date(slots[0]);
              const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
              const dateLabel = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${weekdays[d.getDay()]}`;
              return (
                <div key={dateKey}>
                  <p className="text-sm font-semibold text-primary-600 mb-2 flex items-center gap-1">
                    <CalendarIcon className="w-4 h-4" />
                    {dateLabel}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {slots.map((iso) => {
                      const { date, time } = formatSlot(iso);
                      return (
                        <button
                          key={iso}
                          type="button"
                          onClick={() => setSelectedTime(iso)}
                          className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                            isSelected(iso)
                              ? "bg-accent-50 border-accent-300 text-accent-700"
                              : "border-gray-200 text-gray-600 hover:border-accent-200 hover:bg-accent-50/50"
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5" />
                          {time}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {submitError && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
              {submitError}
            </div>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!selectedTime || submitting}
            className="w-full flex items-center justify-center gap-2 py-3 bg-accent-500 text-white font-semibold rounded-xl hover:bg-accent-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {submitting ? "提交中..." : "确认面试时间"}
          </button>
        </div>
      </div>
    </div>
  );
}
