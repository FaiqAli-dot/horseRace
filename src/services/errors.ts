/** Map backend / network failures to friendly UI copy. */
export function friendlyError(err: unknown, fallback = 'Something went wrong'): string {
  const raw =
    err instanceof Error
      ? err.message
      : typeof err === 'string'
        ? err
        : fallback
  const msg = raw.toLowerCase()

  if (
    msg.includes('failed to fetch') ||
    msg.includes('network') ||
    msg.includes('backend unreachable') ||
    msg.includes('load failed')
  ) {
    return 'BACKEND OFFLINE — start the Go server (port 8080) and refresh.'
  }
  if (msg.includes('betting closed') || msg.includes('locked')) {
    return 'Betting is locked for this race. Pick an open upcoming race.'
  }
  if (msg.includes('insufficient') || msg.includes('balance')) {
    return 'Insufficient balance for that stake.'
  }
  if (msg.includes('stake')) {
    return 'Invalid stake — enter an amount greater than $0.'
  }
  if (msg.includes('duplicate') || msg.includes('idempotency')) {
    return 'Duplicate bet request — your previous bet was kept.'
  }
  if (msg.includes('race not found') || msg.includes('state')) {
    return 'Race state changed — refresh and try again.'
  }
  if (msg.includes('invalid horse') || msg.includes('invalid market')) {
    return 'Invalid selection — choose a horse and market again.'
  }
  return raw || fallback
}
