export async function getChatGPTUser() { return globalThis.__TEST_USER ?? null; }
export function chatGPTSignInPath(p) { return `/signin?return_to=${p}`; }
export function chatGPTSignOutPath(p) { return `/signout?return_to=${p}`; }
