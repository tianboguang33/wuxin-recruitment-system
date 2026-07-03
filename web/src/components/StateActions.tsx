import { useState } from 'react';

export interface AvailableEvent {
  event: string;
  label: string;
  description?: string;
}

interface StateActionsProps {
  availableEvents: AvailableEvent[];
  onTransition: (event: string, reason: string) => Promise<void> | void;
  disabled?: boolean;
}

export default function StateActions({ availableEvents, onTransition, disabled }: StateActionsProps) {
  const [showModal, setShowModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<AvailableEvent | null>(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleClick = (event: AvailableEvent) => {
    setSelectedEvent(event);
    setReason('');
    setShowModal(true);
  };

  const handleConfirm = async () => {
    if (!selectedEvent) return;
    setLoading(true);
    try {
      await onTransition(selectedEvent.event, reason);
      setShowModal(false);
      setSelectedEvent(null);
      setReason('');
    } catch (err) {
      alert(err instanceof Error ? err.message : '操作失败');
    } finally {
      setLoading(false);
    }
  };

  const getButtonStyle = (event: AvailableEvent) => {
    if (event.event.includes('reject') || event.event.includes('fail') || event.event.includes('decline')) {
      return 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100';
    }
    if (event.event.includes('pass') || event.event.includes('accept')) {
      return 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100';
    }
    return 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100';
  };

  if (availableEvents.length === 0) {
    return (
      <div className="text-sm text-gray-500 italic">
        当前状态无可用操作
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {availableEvents.map((event) => (
          <button
            key={event.event}
            onClick={() => handleClick(event)}
            disabled={disabled}
            className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${getButtonStyle(event)} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {event.label}
          </button>
        ))}
      </div>

      {showModal && selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold mb-4" style={{ color: '#1a2332' }}>
              确认操作：{selectedEvent.label}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              请填写操作原因（可选）：
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="请输入原因..."
              className="w-full rounded-lg border px-4 py-3 text-sm outline-none focus:border-blue-400 resize-none"
              style={{ borderColor: '#e2e8f0', color: '#1a2332' }}
              rows={3}
            />
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                disabled={loading}
                className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
                style={{ borderColor: '#e2e8f0' }}
              >
                取消
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
              >
                {loading ? '处理中...' : '确认'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
