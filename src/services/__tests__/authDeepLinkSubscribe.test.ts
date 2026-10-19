import { Linking } from 'react-native';
import { subscribeToAuthDeepLinks } from '../authDeepLink';

jest.mock('../../lib/supabase', () => ({
  getSupabase: jest.fn(),
}));

import { getSupabase } from '../../lib/supabase';

const mockVerifyOtp = jest.fn();
let urlListener: ((event: { url: string }) => void) | null = null;

function flush() {
  return new Promise<void>(resolve => setTimeout(resolve, 0));
}

beforeEach(() => {
  jest.clearAllMocks();
  urlListener = null;
  (getSupabase as jest.Mock).mockReturnValue({
    auth: { verifyOtp: mockVerifyOtp, setSession: jest.fn() },
  });
  jest.spyOn(Linking, 'getInitialURL').mockResolvedValue(null);
  jest
    .spyOn(Linking, 'addEventListener')
    .mockImplementation((_type, handler) => {
      urlListener = handler as (event: { url: string }) => void;
      return { remove: jest.fn() } as never;
    });
});

describe('subscribeToAuthDeepLinks', () => {
  it('reports malformed links (URIError) instead of swallowing them', async () => {
    const onError = jest.fn();
    subscribeToAuthDeepLinks(onError);
    urlListener?.({ url: 'cale://auth/callback?token_hash=%E0%A4%A&type=email' });
    await flush();
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('reports rejected verification calls', async () => {
    mockVerifyOtp.mockRejectedValue(new Error('Network request failed'));
    const onError = jest.fn();
    subscribeToAuthDeepLinks(onError);
    urlListener?.({ url: 'cale://auth/callback?token_hash=abc&type=email' });
    await flush();
    expect(onError).toHaveBeenCalledWith('Network request failed');
  });

  it('reports expired-token errors returned by Supabase', async () => {
    mockVerifyOtp.mockResolvedValue({ error: { message: 'Token has expired' } });
    const onError = jest.fn();
    subscribeToAuthDeepLinks(onError);
    urlListener?.({ url: 'cale://auth/callback?token_hash=abc&type=email' });
    await flush();
    expect(onError).toHaveBeenCalledWith('Token has expired');
  });

  it('ignores non-auth links', async () => {
    const onError = jest.fn();
    subscribeToAuthDeepLinks(onError);
    urlListener?.({ url: 'https://example.com/%E0%A4%A' });
    await flush();
    expect(onError).not.toHaveBeenCalled();
    expect(mockVerifyOtp).not.toHaveBeenCalled();
  });
});
