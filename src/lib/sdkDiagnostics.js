const logged = new Set();

export function sdkDiagLogOnce(key, callName, source, error) {
  try {
    if (window.localStorage.getItem('SR_SDK_DEBUG') !== 'true' || logged.has(key)) return;
    logged.add(key);
    console.warn(`[SDK_DIAG] ${callName} failed | route=${window.location.pathname} | online=${navigator.onLine} | error=${error?.message || 'Network Error'} | timestamp=${new Date().toISOString()}`, {
      callName,
      source,
      route: window.location.pathname,
      online: navigator.onLine,
      error: error?.message || 'Network Error',
      status: error?.status || error?.response?.status || null,
      code: error?.code || null,
      timestamp: new Date().toISOString(),
    });
  } catch {}
}