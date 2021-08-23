import { createNodeMiddleware, Webhooks } from "@octokit/webhooks";
import { WebhookEvent } from "@octokit/webhooks-types";

const webhooks = new Webhooks<WebhookEvent>({
    secret: "mysecret",
});

webhooks.onAny(({ id, name, payload }) => {
    console.log(id, "id");
    console.log(name, "event received");
    console.log(payload, "payload");
});

require("http").createServer(createNodeMiddleware(webhooks)).listen(2199);
// can now receive webhook events at /api/github/webhooks