export class NetworkTimeoutError extends Error {
  constructor(message = 'Network request timed out') {
    super(message);
    this.name = 'NetworkTimeoutError';
  }
}

export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message?: string,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new NetworkTimeoutError(message));
    }, ms);

    promise
      .then(value => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch(error => {
        clearTimeout(timer);
        reject(error);
      });
  });
}
