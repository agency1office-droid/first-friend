export async function register() {}

export async function onRequestError() {
  const { reportServerError } = await import("./lib/server-errors");
  await reportServerError("server.unhandled_request");
}
