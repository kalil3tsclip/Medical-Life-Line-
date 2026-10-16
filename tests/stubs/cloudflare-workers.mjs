export const env = new Proxy({}, { get: (_, k) => globalThis.__TEST_ENV?.[k] });
