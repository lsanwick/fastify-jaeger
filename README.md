# fastify-jaeger

[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](http://standardjs.com/)
[![Lint, Test](https://github.com/lsanwick/fastify-jaeger/workflows/Lint,%20Test/badge.svg?branch=master)](https://github.com/lsanwick/fastify-jaeger/actions?query=workflow%3A%22Lint%2C+Test%22)

Fastify plugin for Jaeger distributed tracing system.

## Install

```sh
npm install lsanwick/fastify-jaeger#master
```

## Usage

Require the plugin and register it within Fastify, the pass the following options: `{ serviceName [, exposeAPI] }`

_exposeAPI: (true by default)_ Exposes the Span API, binded to the current request, which allows the user to setTags, and log the current span.

This plugins supports all options and configurations of [jaeger-client-node's `initTracer` method](https://github.com/jaegertracing/jaeger-client-node#initialization).

- The options param can be configured via `opts.initTracerOpts`
- All other top-level `opts` will be passed in as the config param.

It uses the logger set to the fastify instance as the tracer logger.

```js
import fastify from "fastify";
import jaegerPlugin from "fastify-jaeger";

const app = fastify();

app.register(jaegerPlugin, {
  serviceName: "my-service-name",
});

app.get("/", (req, reply) => {
  reply.send({ hello: "world" });
});

app.listen(3000, (err) => {
  if (err) throw err;
  console.log("Server listening on localhost:", fastify.server.address().port);
});
```

## License

Licensed under [MIT](./LICENSE).
