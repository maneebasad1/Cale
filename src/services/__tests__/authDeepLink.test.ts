import {
  createSessionFromUrl,
  isAuthRedirectUrl,
  parseUrlParams,
} from '../authDeepLink';

jest.mock('../../lib/supabase', () => ({
  getSupabase: jest.fn(),
}));

import { getSupabase } from '../../lib/supabase';

const mockVerifyOtp = jest.fn();
const mockSetSession = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (getSupabase as jest.Mock).mockReturnValue({
    auth: {
      verifyOtp: mockVerifyOtp.mockResolvedValue({ error: null }),
      setSession: mockSetSession.mockResolvedValue({ error: null }),
    },
  });
});

describe('parseUrlParams', () => {
  it('reads query params from deep link', () => {
    expect(
      parseUrlParams(
        'cale://auth/callback?token_hash=abc123&type=signup',
      ),
    ).toEqual({ token_hash: 'abc123', type: 'signup' });
  });

  it('reads hash params from redirect', () => {
    expect(
      parseUrlParams(
        'cale://auth/callback#access_token=at&refresh_token=rt',
      ),
    ).toEqual({ access_token: 'at', refresh_token: 'rt' });
  });
});

describe('createSessionFromUrl', () => {
  it('verifies email signup token hash', async () => {
    const error = await createSessionFromUrl(
      'cale://auth/callback?token_hash=hash-value&type=signup',
    );

    expect(error).toBeNull();
    expect(mockVerifyOtp).toHaveBeenCalledWith({
      token_hash: 'hash-value',
      type: 'signup',
    });
    expect(mockSetSession).not.toHaveBeenCalled();
  });

  it('sets session from access and refresh tokens', async () => {
    const error = await createSessionFromUrl(
      'cale://auth/callback#access_token=at&refresh_token=rt',
    );

    expect(error).toBeNull();
    expect(mockSetSession).toHaveBeenCalledWith({
      access_token: 'at',
      refresh_token: 'rt',
    });
  });

  it('ignores unrelated urls', async () => {
    expect(isAuthRedirectUrl('https://example.com')).toBe(false);
    expect(await createSessionFromUrl('https://example.com')).toBeNull();
  });
});
