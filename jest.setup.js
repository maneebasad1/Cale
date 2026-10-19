/* global jest */
// Native module mocks so the full app tree can render under Jest.
import 'react-native-gesture-handler/jestSetup';

jest.mock('@react-native-community/netinfo', () =>
  require('@react-native-community/netinfo/jest/netinfo-mock.js'),
);

jest.mock('@notifee/react-native', () =>
  require('@notifee/react-native/jest-mock.js'),
);

jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map();
  const api = {
    getItem: jest.fn(async key => (store.has(key) ? store.get(key) : null)),
    setItem: jest.fn(async (key, value) => {
      store.set(key, value);
    }),
    removeItem: jest.fn(async key => {
      store.delete(key);
    }),
    multiRemove: jest.fn(async keys => {
      keys.forEach(key => store.delete(key));
    }),
    getAllKeys: jest.fn(async () => [...store.keys()]),
    clear: jest.fn(async () => store.clear()),
  };
  return { __esModule: true, default: api, ...api };
});

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(async () => true),
    signIn: jest.fn(),
    signOut: jest.fn(async () => undefined),
  },
  statusCodes: {},
  isSuccessResponse: jest.fn(() => false),
  isErrorWithCode: jest.fn(() => false),
}));

jest.mock('react-native-in-app-review', () => ({
  isAvailable: jest.fn(() => false),
  RequestInAppReview: jest.fn(async () => false),
}));
