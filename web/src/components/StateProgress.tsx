import { Check } from 'lucide-react';

export interface StateInfo {
  state: string;
  name: string;
  description?: string;
  category: 'initial' | 'progress' | 'success' | 'failed' | 'final';
  order: number;
}

interface StateProgressProps {
  allStates: StateInfo[];
  currentState: string;
}

export default function StateProgress({ allStates, currentState }: StateProgressProps) {
  const currentIndex = allStates.findIndex((s) => s.state === currentState);

  const getStatusColor = (state: StateInfo, index: number) => {
    if (index < currentIndex) {
      return 'bg-green-500 border-green-500 text-white';
    }
    if (index === currentIndex) {
      if (state.category === 'failed') {
        return 'bg-red-500 border-red-500 text-white';
      }
      if (state.category === 'success') {
        return 'bg-green-500 border-green-500 text-white';
      }
      return 'bg-blue-500 border-blue-500 text-white';
    }
    return 'bg-gray-100 border-gray-200 text-gray-400';
  };

  const getLineColor = (index: number) => {
    if (index < currentIndex) {
      return 'bg-green-500';
    }
    return 'bg-gray-200';
  };

  const getTextColor = (state: StateInfo, index: number) => {
    if (index < currentIndex) return 'text-green-600';
    if (index === currentIndex) {
      if (state.category === 'failed') return 'text-red-600';
      if (state.category === 'success') return 'text-green-600';
      return 'text-blue-600';
    }
    return 'text-gray-400';
  };

  const mainStates = allStates.filter(
    (s) => s.category === 'initial' || s.category === 'progress' || s.category === 'success'
  );

  return (
    <div className="w-full py-4">
      <div className="flex items-center justify-between">
        {mainStates.map((state, index) => (
          <div key={state.state} className="flex flex-1 flex-col items-center relative">
            {index > 0 && (
              <div
                className={`absolute top-4 left-0 w-full h-0.5 -translate-x-1/2 ml-4 ${getLineColor(index - 1)}`}
                style={{ width: 'calc(100% - 2rem)' }}
              />
            )}
            <div
              className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 font-medium text-sm ${getStatusColor(state, index)}`}
            >
              {index < currentIndex ? <Check size={16} /> : index + 1}
            </div>
            <div className={`mt-2 text-xs font-medium text-center ${getTextColor(state, index)}`}>
              {state.name}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
