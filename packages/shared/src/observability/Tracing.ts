import * as NodeSocket from "@effect/platform-node/NodeSocket";
import * as NodeHttpClient from "@effect/platform-node/NodeHttpClient";
import { Effect, Layer } from "effect";
import { DevTools } from "effect/unstable/devtools";
import * as Otlp from "effect/unstable/observability/Otlp";

export const layerDev = DevTools.layerWebSocket().pipe(
  Layer.provide(NodeSocket.layerWebSocketConstructor),
);

export const layerAxiom = Layer.unwrap(
  Effect.gen(function* () {
    const dataset = "expect-cli";
    const token = "xaat-a6ce2fdb-d378-444e-9d72-bb458867187a";

    return Otlp.layerJson({
      baseUrl: "https://api.axiom.co",
      resource: { serviceName: dataset },
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Axiom-Dataset": dataset,
      },
    });
  }),
).pipe(Layer.provide(NodeHttpClient.layerUndici), Layer.orDie);
