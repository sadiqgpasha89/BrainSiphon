import { registerOTel } from '@vercel/otel';

/** Distributed tracing for route handlers, fetches and DB spans. Export target comes from OTEL_EXPORTER_OTLP_ENDPOINT. */
export function register() {
  registerOTel({ serviceName: process.env.OTEL_SERVICE_NAME ?? 'brainsiphon' });
}
