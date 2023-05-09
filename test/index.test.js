import createFastify from "fastify";
import { vi, describe, test, expect, afterEach, beforeEach } from "vitest";
import jaegerClient from "jaeger-client";

describe("jaegerPlugin", () => {
  const initTracerSpy = vi.spyOn(jaegerClient, "initTracer");

  const mockApp = async (pluginOpts) => {
    const fastify = await createFastify();
    await fastify.register(require("../index"), pluginOpts);
    return fastify;
  };

  afterEach(() => {
    vi.resetAllMocks();
  });

  test("Should not expose jaeger api when explicitly set to false", async () => {
    const fastify = await mockApp({
      serviceName: "unexposed",
      exposeAPI: false,
    });

    expect(fastify.hasRequestDecorator("jaeger")).toBeFalsy();
  });

  test("should use default config when no configuration is provided", async () => {
    const fastify = await mockApp({
      serviceName: "default-config",
    });

    await fastify.inject({ method: "GET", url: "/" });

    expect(initTracerSpy).toHaveBeenCalledOnce();
    expect(initTracerSpy).toHaveBeenCalledWith(
      {
        serviceName: "default-config",
        sampler: { type: "const", param: 1 },
        reporter: { logSpans: false },
      },
      {
        logger: fastify.log,
      }
    );

    expect(fastify.hasRequestDecorator("jaeger")).toBeTruthy();
  });

  test("should merge default config with the user provided config", async () => {
    const fastify = await mockApp({
      serviceName: "user-config",
      reporter: {
        logSpans: true,
      },
      initTracerOpts: {
        tags: {
          foo: "bar",
        },
      },
    });

    await fastify.inject({ method: "GET", url: "/" });

    expect(initTracerSpy).toHaveBeenCalledOnce();
    expect(initTracerSpy).toHaveBeenCalledWith(
      {
        serviceName: "user-config",
        sampler: { type: "const", param: 1 },
        reporter: { logSpans: true },
      },
      {
        logger: fastify.log,
        tags: {
          foo: "bar",
        },
      }
    );

    expect(fastify.hasRequestDecorator("jaeger")).toBeTruthy();
  });

  test("Should set proper tag values on response", async () => {
    const fastify = await mockApp({
      serviceName: "restest",
      exposeAPI: true,
    });

    fastify.get("/test", (req, reply) => {
      const span = req.jaeger().span;
      const tagMethod = span._tags.find((tag) => tag.key === "http.method");
      const tagRoute = span._tags.find((tag) => tag.key === "http.url");
      expect(tagRoute).toEqual({ key: "http.url", value: "/test" });
      expect(tagMethod).toEqual({ key: "http.method", value: "GET" });
      return reply.code(200).send({ hello: "world" });
    });

    fastify.get("/restest", async (req, reply) => {
      const span = req.jaeger().span;
      const tagRes = span._tags.find((tag) => tag.key === "http.status_code");
      expect(tagRes?.key).toBe("http.status_code");
      expect(tagRes?.value).toBe(200);
      return {};
    });

    fastify.get("/error", async (req, reply) => {
      const span = req.jaeger().span;
      const tagError = span._tags.find((tag) => tag.key === "error");
      expect(tagError.key).toBe("error");
      expect(tagError.value).toContain({
        message: "test error",
      });
      throw new Error("test error");
    });

    await fastify.inject({
      method: "GET",
      url: "/test",
    });

    await fastify.inject({
      method: "GET",
      url: "/restest",
    });

    await fastify.inject({
      method: "GET",
      url: "/error",
    });
  });
});
