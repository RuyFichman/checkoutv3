export function getWebRuntimeSummary() {
  return {
    service: 'web',
    status: 'ok' as const,
    timestamp: new Date().toISOString(),
  };
}
