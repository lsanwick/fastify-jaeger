import { Span } from "opentracing";
import { FastifyPluginCallback } from "fastify";
import { TracingOptions, TracingConfig, JaegerTracer } from "jaeger-client";

export interface FastifyJaegerPluginOptions extends TracingConfig {
  serviceName?: string;
  /**
   * If `true`, will decorate the `fastify` request with a `jaeger` object.
   *
   * ### Example
   *
   * ```js
   * fastify.get('/', (req, res) => {
   *  req.jaeger.span.log({ event: 'request received' })
   * })
   * ```
   *
   * @default true
   */
  exposeAPI?: boolean;
  /**
   * Additional carrier data to include on the span context, combined with
   * any HTTP headers.
   */
  state?: Record<string, string>;
  /**
   * Options to pass to the Jaeger tracer, will be merged with the defaults below:
   *
   * ```js
   * {
   *   sampler: {
   *     type: 'const',
   *     param: 1,
   *   },
   *   reporter: {
   *     logSpans: false,
   *   },
   * }
   * ```
   */
  initTracerOpts?: TracingOptions;
}

declare module "fastify" {
  interface FastifyRequest {
    jaeger: () => { tracer: JaegerTracer; span: Span; tags: [string] };
  }
}

declare const fastifyJaeger: FastifyPluginCallback<FastifyJaegerPluginOptions>;
export default fastifyJaeger;
