// Test stand-in for next/headers: returns the headers the current test chose.
export async function headers() {
  const make = globalThis.__TEST_HEADERS;
  return new Headers(typeof make === "function" ? await make() : make || {});
}
