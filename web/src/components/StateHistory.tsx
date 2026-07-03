import { Clock, User } from 'lucide-react';

export interface StateHistoryRecord {
  id: number;
  entity_type: string;
  entity_id: number;
  from_state: string;
  to_state: string;
  event: string;
  operator: string;
  reason: string;
  created_at: string;
}

interface StateHistoryProps {
  history: StateHistoryRecord[];
  stateLabels?: Record<string, string>;
  eventLabels?: Record<string, string>;
}

export default function StateHistory({ history, stateLabels, eventLabels }: StateHistoryProps) {
  const getStateLabel = (state: string) => stateLabels?.[state] || state;
  const getEventLabel = (event: string) => eventLabels?.[event] || event;

  const getEventColor = (event: string) => {
    if (event.includes('reject') || event.includes('fail') || event.includes('decline')) {
      return 'bg-red-100 text-red-600 border-red-200';
    }
    if (event.includes('pass') || event.includes('accept')) {
      return 'bg-green-100 text-green-600 border-green-200';
    }
    if (event.includes('start') || event.includes('send')) {
      return 'bg-blue-100 text-blue-600 border-blue-200';
    }
    return 'bg-gray-100 text-gray-600 border-gray-200';
  };

  if (history.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-gray-500">
        暂无状态变更记录
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200" />
      
      <div className="space-y-4">
        {history.map((record, index) => (
          <div key={record.id} className="relative flex gap-4 pl-10">
            <div
              className={`absolute left-2 top-1 h-4 w-4 rounded-full border-2 ${
                index === 0 ? 'bg-blue-500 border-blue-500' : 'bg-white border-gray-300'
              }`}
            />
            
            <div className="flex-1 rounded-lg border bg-white p-4 shadow-sm" style={{ borderColor: '#e2e8f0' }}>
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${getEventColor(record.event)}`}
                >
                  {getEventLabel(record.event)}
                </span>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Clock size={12} />
                  {record.created_at}
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-sm mb-2" style={{ color: '#475569' }}>
                <span className="text-gray-500">{getStateLabel(record.from_state)}</span>
                <span className="text-gray-400">→</span>
                <span className="font-medium">{getStateLabel(record.to_state)}</span>
              </div>
              
              {record.operator && (
                <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                  <User size={12} />
                  <span>操作人：{record.operator}</span>
                </div>
              )}
              
              {record.reason && (
                <div className="text-xs text-gray-600 bg-gray-50 rounded px-3 py-2 mt-2">
                  {record.reason}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
