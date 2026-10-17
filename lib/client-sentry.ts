import { init } from "@sentry/react";
import { sanitizeSentryEvent } from "./sentry-privacy";

export { captureException } from "@sentry/react";

export function initialize() {
  init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: "production",
    dataCollection: {
      userInfo: false, cookies: false, httpHeaders: false, httpBodies: [],
      urlQueryParams: false, stackFrameVariables: false, frameContextLines: 0,
      genAI: { inputs: false, outputs: false },
      graphQL: { document: false, variables: false }, databaseQueryData: false, queues: false,
    },
    maxBreadcrumbs: 0,
    sendClientReports: false,
    integrations: defaults => defaults.filter(integration =>
      ["EventFilters", "FunctionToString", "BrowserApiErrors", "GlobalHandlers", "Dedupe"].includes(integration.name)),
    beforeSend: sanitizeSentryEvent,
  });
}
