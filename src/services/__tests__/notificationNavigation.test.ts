const mockFlush = jest.fn();
const mockQueue = jest.fn();
const mockIsReady = jest.fn();
const mockGetRootState = jest.fn();
let mockForegroundHandler:
  | ((event: { type: number; detail: unknown }) => void)
  | null = null;
let mockStateListener: (() => void) | null = null;

jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: {
    onForegroundEvent: (handler: typeof mockForegroundHandler) => {
      mockForegroundHandler = handler;
      return jest.fn();
    },
    onBackgroundEvent: jest.fn(),
    getInitialNotification: jest.fn().mockResolvedValue(null),
  },
  EventType: { PRESS: 1 },
}));

jest.mock('../../navigation/navigationRef', () => ({
  flushPendingNotificationNavigation: (canNavigate: boolean) =>
    mockFlush(canNavigate),
  queueNotificationNavigation: (n: unknown) => mockQueue(n),
  navigationRef: {
    isReady: () => mockIsReady(),
    getRootState: () => mockGetRootState(),
    addListener: (_event: string, listener: () => void) => {
      mockStateListener = listener;
      return jest.fn();
    },
  },
}));

import {
  registerNotificationNavigationHandlers,
  setNotificationNavigationReady,
} from '../notificationNavigation';

const PRESS = 1;
const notification = { id: 'meal-reminder-dinner', data: { target: 'AddEntry' } };

beforeEach(() => {
  jest.clearAllMocks();
  mockIsReady.mockReturnValue(true);
  setNotificationNavigationReady(false);
  mockFlush.mockClear();
  registerNotificationNavigationHandlers();
});

describe('notification navigation readiness gate', () => {
  it('keeps a foreground press pending while only Auth is mounted', () => {
    mockGetRootState.mockReturnValue({ routeNames: ['Auth'] });
    mockForegroundHandler?.({ type: PRESS, detail: { notification } });
    expect(mockQueue).toHaveBeenCalledWith(notification);
    expect(mockFlush).not.toHaveBeenCalledWith(true);
  });

  it('keeps it pending when ready flag is set but Main is not mounted yet', () => {
    mockGetRootState.mockReturnValue({ routeNames: ['Onboarding'] });
    setNotificationNavigationReady(true);
    mockForegroundHandler?.({ type: PRESS, detail: { notification } });
    expect(mockFlush).not.toHaveBeenCalledWith(true);
  });

  it('flushes once Main mounts', () => {
    mockGetRootState.mockReturnValue({ routeNames: ['Onboarding'] });
    setNotificationNavigationReady(true);
    mockForegroundHandler?.({ type: PRESS, detail: { notification } });
    expect(mockFlush).not.toHaveBeenCalledWith(true);

    mockGetRootState.mockReturnValue({ routeNames: ['Main'] });
    mockStateListener?.();
    expect(mockFlush).toHaveBeenCalledWith(true);
  });

  it('navigates immediately when ready and Main is mounted', () => {
    mockGetRootState.mockReturnValue({ routeNames: ['Main', 'Auth'] });
    setNotificationNavigationReady(true);
    mockFlush.mockClear();
    mockForegroundHandler?.({ type: PRESS, detail: { notification } });
    expect(mockFlush).toHaveBeenCalledWith(true);
  });
});
