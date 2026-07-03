import {
  StateMachineConfig,
  TransitionResult,
  AvailableEvent,
} from './types';

export class StateMachine<
  TState extends string = string,
  TEvent extends string = string,
  TContext = any
> {
  private config: StateMachineConfig<TState, TEvent, TContext>;
  private currentState: TState;
  private context: TContext;

  constructor(
    config: StateMachineConfig<TState, TEvent, TContext>,
    initialState?: TState,
    context?: TContext
  ) {
    this.config = config;
    this.currentState = initialState || config.initial;
    this.context = context || ({} as TContext);
  }

  getState(): TState {
    return this.currentState;
  }

  getStateMeta() {
    return this.config.states[this.currentState];
  }

  getContext(): TContext {
    return this.context;
  }

  setContext(context: Partial<TContext>): void {
    this.context = { ...this.context, ...context };
  }

  canTransition(event: TEvent): boolean {
    const transition = this.findTransition(event);
    return transition !== null;
  }

  getAvailableEvents(): TEvent[] {
    const events: TEvent[] = [];
    for (const t of this.config.transitions) {
      const fromStates = Array.isArray(t.from) ? t.from : [t.from];
      if (fromStates.includes(this.currentState)) {
        events.push(t.event);
      }
    }
    return [...new Set(events)];
  }

  getAvailableEventsWithMeta(): AvailableEvent[] {
    const events = this.getAvailableEvents();
    return events.map((event) => ({
      event,
      label: this.eventToLabel(event),
    }));
  }

  isFinalState(): boolean {
    const meta = this.getStateMeta();
    return meta.category === 'final' || meta.category === 'success' || meta.category === 'failed';
  }

  async transition(event: TEvent): Promise<TransitionResult<TState>> {
    const fromState = this.currentState;
    const transition = this.findTransition(event);

    if (!transition) {
      const availableEvents = this.getAvailableEvents();
      return {
        success: false,
        fromState,
        toState: fromState,
        event,
        error: `Invalid transition: cannot trigger event '${event}' from state '${fromState}'. Available events: ${availableEvents.join(', ') || 'none'}`,
        availableEvents: availableEvents as string[],
      };
    }

    if (transition.guard) {
      try {
        const canProceed = await transition.guard(this.context);
        if (!canProceed) {
          return {
            success: false,
            fromState,
            toState: fromState,
            event,
            error: `Guard condition failed for event '${event}' from state '${fromState}'`,
          };
        }
      } catch (err) {
        return {
          success: false,
          fromState,
          toState: fromState,
          event,
          error: `Guard condition error: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    }

    const toState = transition.to;
    const actions = this.config.actions;

    try {
      const fromStateActions = actions?.[fromState];
      if (fromStateActions?.onExit) {
        await fromStateActions.onExit(this.context, toState, event);
      }

      this.currentState = toState;

      const toStateActions = actions?.[toState];
      if (toStateActions?.onEnter) {
        await toStateActions.onEnter(this.context, fromState, event);
      }

      return {
        success: true,
        fromState,
        toState,
        event,
      };
    } catch (err) {
      this.currentState = fromState;
      return {
        success: false,
        fromState,
        toState: fromState,
        event,
        error: `Transition action error: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  private findTransition(event: TEvent) {
    for (const t of this.config.transitions) {
      if (t.event !== event) continue;
      const fromStates = Array.isArray(t.from) ? t.from : [t.from];
      if (fromStates.includes(this.currentState)) {
        return t;
      }
    }
    return null;
  }

  private eventToLabel(event: string): string {
    return event
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  getAllStates(): Array<{ state: TState; meta: typeof this.config.states[TState] }> {
    return (Object.keys(this.config.states) as TState[]).map((state) => ({
      state,
      meta: this.config.states[state],
    }));
  }

  getStatesOrdered(): Array<{ state: TState; meta: typeof this.config.states[TState] }> {
    return this.getAllStates().sort((a, b) => {
      const orderA = a.meta.order ?? 999;
      const orderB = b.meta.order ?? 999;
      return orderA - orderB;
    });
  }
}
