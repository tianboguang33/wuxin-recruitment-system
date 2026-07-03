import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, User, Briefcase } from 'lucide-react';
import StateProgress, { StateInfo } from '@/components/StateProgress';
import StateActions, { AvailableEvent } from '@/components/StateActions';
import StateHistory, { StateHistoryRecord } from '@/components/StateHistory';

interface ApplicationDetail {
  id: number;
  name: string;
  phone: string;
  email: string;
  job_id: number;
  job_title?: string;
  job_department?: string;
  education: string;
  experience: string;
  cover_letter: string;
  status: string;
  created_at: string;
  updated_at: string;
}

const stateLabels: Record<string, string> = {
  pending: '待审核',
  screening: '初筛中',
  screened: '初筛通过',
  screening_rejected: '初筛淘汰',
  interviewing: '面试中',
  interview_passed: '面试通过',
  interview_failed: '面试未通过',
  offer_sent: '已发Offer',
  accepted: '已录用',
  declined: '已放弃',
  rejected: '已淘汰',
};

const eventLabels: Record<string, string> = {
  start_screening: '开始初筛',
  pass_screening: '初筛通过',
  reject_screening: '初筛淘汰',
  start_interview: '安排面试',
  pass_interview: '面试通过',
  fail_interview: '面试未通过',
  send_offer: '发送Offer',
  accept_offer: '接受Offer',
  decline_offer: '放弃Offer',
  reject: '淘汰',
  manual_update: '手动更新',
};

export default function ApplicationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [application, setApplication] = useState<ApplicationDetail | null>(null);
  const [allStates, setAllStates] = useState<StateInfo[]>([]);
  const [availableEvents, setAvailableEvents] = useState<AvailableEvent[]>([]);
  const [history, setHistory] = useState<StateHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const token = () => localStorage.getItem('admin_token');

  const fetchData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [appRes, stateRes, historyRes] = await Promise.all([
        fetch(`/api/applications`, {
          headers: { Authorization: `Bearer ${token()}` },
        }).then((r) => r.json()),
        fetch(`/api/applications/${id}/state`, {
          headers: { Authorization: `Bearer ${token()}` },
        }).then((r) => r.json()),
        fetch(`/api/applications/${id}/history`, {
          headers: { Authorization: `Bearer ${token()}` },
        }).then((r) => r.json()),
      ]);

      if (appRes.data?.applications) {
        const app = appRes.data.applications.find((a: any) => a.id === parseInt(id, 10));
        setApplication(app);
      }

      if (stateRes.data) {
        setAllStates(stateRes.data.allStates || []);
        setAvailableEvents(stateRes.data.availableEvents || []);
      }

      if (historyRes.data) {
        setHistory(historyRes.data.history || []);
      }
    } catch (err) {
      console.error('Failed to fetch application:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTransition = async (event: string, reason: string) => {
    if (!id) return;
    const res = await fetch(`/api/applications/${id}/transition`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token()}`,
      },
      body: JSON.stringify({ event, reason }),
    });
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || '操作失败');
    }
    await fetchData();
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-12 text-gray-500">加载中...</div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="p-8">
        <button
          onClick={() => navigate('/admin/applications')}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft size={16} />
          返回列表
        </button>
        <div className="text-center py-12 text-gray-500">投递记录不存在</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <button
        onClick={() => navigate('/admin/applications')}
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft size={16} />
        返回列表
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2" style={{ color: '#1a2332' }}>
          {application.name}
        </h1>
        <p className="text-gray-500">
          应聘岗位：{application.job_title || `岗位 #${application.job_id}`}
          {application.job_department ? `（${application.job_department}）` : ''}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border bg-white p-6 shadow-sm" style={{ borderColor: '#e2e8f0' }}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: '#1a2332' }}>
              招聘流程
            </h2>
            <StateProgress allStates={allStates} currentState={application.status} />
          </div>

          <div className="rounded-xl border bg-white p-6 shadow-sm" style={{ borderColor: '#e2e8f0' }}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: '#1a2332' }}>
              状态操作
            </h2>
            <StateActions
              availableEvents={availableEvents}
              onTransition={handleTransition}
            />
          </div>

          <div className="rounded-xl border bg-white p-6 shadow-sm" style={{ borderColor: '#e2e8f0' }}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: '#1a2332' }}>
              状态历史
            </h2>
            <StateHistory
              history={history}
              stateLabels={stateLabels}
              eventLabels={eventLabels}
            />
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border bg-white p-6 shadow-sm" style={{ borderColor: '#e2e8f0' }}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: '#1a2332' }}>
              基本信息
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <User size={16} className="text-gray-400" />
                <span style={{ color: '#475569' }}>{application.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone size={16} className="text-gray-400" />
                <span style={{ color: '#475569' }}>{application.phone}</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail size={16} className="text-gray-400" />
                <span style={{ color: '#475569' }}>{application.email}</span>
              </div>
              <div className="flex items-center gap-3">
                <Briefcase size={16} className="text-gray-400" />
                <span style={{ color: '#94a3b8' }}>
                  投递时间：{application.created_at}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-white p-6 shadow-sm" style={{ borderColor: '#e2e8f0' }}>
            <h2 className="text-lg font-semibold mb-3" style={{ color: '#1a2332' }}>
              教育经历
            </h2>
            <p className="text-sm whitespace-pre-wrap" style={{ color: '#475569' }}>
              {application.education || '无'}
            </p>
          </div>

          <div className="rounded-xl border bg-white p-6 shadow-sm" style={{ borderColor: '#e2e8f0' }}>
            <h2 className="text-lg font-semibold mb-3" style={{ color: '#1a2332' }}>
              工作经验
            </h2>
            <p className="text-sm whitespace-pre-wrap" style={{ color: '#475569' }}>
              {application.experience || '无'}
            </p>
          </div>

          {application.cover_letter && (
            <div className="rounded-xl border bg-white p-6 shadow-sm" style={{ borderColor: '#e2e8f0' }}>
              <h2 className="text-lg font-semibold mb-3" style={{ color: '#1a2332' }}>
                求职信
              </h2>
              <p className="text-sm whitespace-pre-wrap" style={{ color: '#475569' }}>
                {application.cover_letter}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
