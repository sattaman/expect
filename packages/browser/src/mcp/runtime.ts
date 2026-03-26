import { Layer, Logger, ManagedRuntime } from "effect";
import * as NodeServices from "@effect/platform-node/NodeServices";
import { McpSession } from "./mcp-session";

const StderrLoggerLayer = Layer.succeed(Logger.LogToStderr, true);

export const McpRuntime = ManagedRuntime.make(
  McpSession.layer.pipe(Layer.provide(StderrLoggerLayer), Layer.provide(NodeServices.layer)),
);
