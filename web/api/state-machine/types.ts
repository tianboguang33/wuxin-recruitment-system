export type StateCategory = 'initial' | 'progress' | 'success' | 'failed' | 'final';

export interface StateMeta {
  name: string;
  description?: string;
  category: StateCategory;
  order?: number;
}

export interface TransitionConfig<
  TState extends string = string,
  TEvent extends string = string,
  TContext = any
> {
  from: TState | TState[];
  to: TState;
  event: TEvent;
  guard?: (context: TContext) => boolean | Promise<boolean>;
}

export interface StateActions<
  TState extends string = string,
  TContext = any
> {
  onEnter?: (context: TContext, fromState: TState, event: string) => void | Promise<void>;
  onExit?: (context: TContext, toState: TState, event: string) => void | Promise<void>;
}

export interface StateMachineConfig<
  TState extends string = string,
  TEvent extends string = string,
  TContext = any
> {
  id: string;
  initial: TState;
  states: Record<TState, StateMeta>;
  transitions: TransitionConfig<TState, TEvent, TContext>[];
  actions?: Partial<Record<TState, StateActions<TState, TContext>>>;
}

export interface TransitionResult<TState extends string = string> {
  success: boolean;
  fromState: TState;
  toState: TState;
  event: string;
  error?: string;
  availableEvents?: string[];
}

export interface AvailableEvent {
  event: string;
  label: string;
  description?: string;
}
