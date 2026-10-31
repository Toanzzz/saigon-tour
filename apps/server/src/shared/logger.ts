export function log(
  event: string,
  message: string,
  level: 'info' | 'warn' = 'info'
): void {
  process.stdout.write(
    `${JSON.stringify({
      _timestamp: new Date().toISOString(),
      level,
      event,
      service_name: 'saigon-tour-api',
      trace_id: '',
      span_id: '',
      message,
    })}\n`
  )
}
