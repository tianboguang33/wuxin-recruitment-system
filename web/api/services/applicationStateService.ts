import { StateMachine } from '../state-machine/index.js';
import {
  applicationStateMachineConfig,
  ApplicationState,
  ApplicationEvent,
  ApplicationContext,
  applicationEventLabels,
} from '../state-machine/configs/applicationStateMachine.js';
import {
  addStateHistory,
  getStateHistory,
  StateHistoryRecord,
} from '../db.js';

export interface StateInfo {
  state: ApplicationState;
  name: string;
  description?: string;
  category: string;
  order: number;
}

export interface AvailableEventInfo {
  event: ApplicationEvent;
  label: string;
}

export interface TransitionResultInfo {
  success: boolean;
  fromState: ApplicationState;
  toState: ApplicationState;
  event: ApplicationEvent;
  error?: string;
  availableEvents?: string[];
}

export class ApplicationStateService {
  static createMachine(
    applicationId: number,
    initialState?: ApplicationState,
    context?: Partial<ApplicationContext>
  ): StateMachine<ApplicationState, ApplicationEvent, ApplicationContext> {
    const defaultContext: ApplicationContext = {
      applicationId,
      ...context,
    };
    return new StateMachine<ApplicationState, ApplicationEvent, ApplicationContext>(
      applicationStateMachineConfig,
      initialState,
      defaultContext
    );
  }

  static getStateInfo(state: ApplicationState): StateInfo {
    const meta = applicationStateMachineConfig.states[state];
    return {
      state,
      name: meta.name,
      description: meta.description,
      category: meta.category,
      order: meta.order ?? 999,
    };
  }

  static getAllStates(): StateInfo[] {
    return Object.keys(applicationStateMachineConfig.states)
      .map((state) => this.getStateInfo(state as ApplicationState))
      .sort((a, b) => a.order - b.order);
  }

  static getCurrentStateInfo(state: ApplicationState): StateInfo {
    return this.getStateInfo(state);
  }

  static getAvailableEvents(state: ApplicationState): AvailableEventInfo[] {
    const machine = this.createMachine(0, state);
    const events = machine.getAvailableEvents();
    return events.map((event) => ({
      event,
      label: applicationEventLabels[event] || event,
    }));
  }

  static async transition(
    applicationId: number,
    currentState: ApplicationState,
    event: ApplicationEvent,
    operator: string = '',
    reason: string = '',
    context?: Partial<ApplicationContext>
  ): Promise<TransitionResultInfo> {
    const machine = this.createMachine(applicationId, currentState, {
      ...context,
      applicationId,
      operator,
      reason,
    });

    const result = await machine.transition(event);

    if (result.success) {
      addStateHistory(
        'application',
        applicationId,
        result.fromState,
        result.toState,
        result.event,
        operator,
        reason
      );
    }

    return {
      success: result.success,
      fromState: result.fromState,
      toState: result.toState,
      event: result.event as ApplicationEvent,
      error: result.error,
      availableEvents: result.availableEvents,
    };
  }

  static getHistory(applicationId: number): StateHistoryRecord[] {
    return getStateHistory('application', applicationId);
  }

  static isFinalState(state: ApplicationState): boolean {
    const meta = applicationStateMachineConfig.states[state];
    return meta.category === 'success' || meta.category === 'failed';
  }
}
