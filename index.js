"use strict";

const fp = require("fastify-plugin");
const { initTracer, opentracing } = require("jaeger-client");
const url = require("url");

const { Tags, FORMAT_HTTP_HEADERS } = opentracing;

module.exports = fp(
  (fastify, opts, next) => {
    if (!opts.serviceName) {
      throw new Error("Jaeger Plugin requires serviceName option");
    }
    const { state = {}, initTracerOpts = {}, ...tracerConfig } = opts;
    const exposeAPI = opts.exposeAPI !== false;
    const defaultConfig = {
      sampler: {
        type: "const",
        param: 1,
      },
      reporter: {
        logSpans: false,
      },
    };

    const defaultOptions = {
      logger: fastify.log,
    };

    let tracer = null;

    const init = () => {
      tracer = initTracer(
        { ...defaultConfig, ...tracerConfig },
        { ...defaultOptions, ...initTracerOpts }
      );
    };

    const tracerMap = new WeakMap();

    function api() {
      const req = this;
      return {
        tracer,
        get span() {
          return tracerMap.get(req);
        },
        tags: Tags,
      };
    }

    if (exposeAPI) {
      fastify.decorateRequest("jaeger", api);
    }

    function filterObject(obj) {
      const ret = {};
      Object.keys(obj)
        .filter((key) => obj[key] != null)
        .forEach((key) => {
          ret[key] = obj[key];
        });

      return ret;
    }

    function setContext(headers) {
      return filterObject({ ...headers, ...state });
    }

    fastify.addHook("onRequest", (req, res, done) => {
      init();
      const parentSpanContext = tracer.extract(
        FORMAT_HTTP_HEADERS,
        setContext(req.raw.headers)
      );
      const span = tracer.startSpan(
        `${req.raw.method} - ${url.format(req.raw.url)}`,
        {
          childOf: parentSpanContext,
          tags: {
            [Tags.SPAN_KIND]: Tags.SPAN_KIND_RPC_SERVER,
            [Tags.HTTP_METHOD]: req.raw.method,
            [Tags.HTTP_URL]: url.format(req.raw.url),
          },
        }
      );

      tracerMap.set(req, span);
      done();
    });
    fastify.addHook("onResponse", (req, reply, done) => {
      const span = tracerMap.get(req);
      span.setTag(Tags.HTTP_STATUS_CODE, reply.statusCode);
      span.finish();
      done();
    });
    fastify.addHook("onError", (req, reply, error, done) => {
      const span = tracerMap.get(req);
      span.setTag(Tags.ERROR, {
        "error.object": error,
        message: error.message,
        stack: error.stack,
      });
      done();
    });
    fastify.addHook("onClose", (instance, done) => {
      tracer.close(done);
    });
    next();
  },
  { name: "fastify-jaeger" }
);
