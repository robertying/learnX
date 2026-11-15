// What the course-site HTML page (helpers/html.ts) and the web view that
// shows it (components/AutoHeightWebView) share.

let scriptNonce: string | undefined;

/**
 * Marks the template's own scripts, the only ones its policy lets run: the
 * content is written by teachers and runs as Web Learning, with the login
 * cookies. One per launch, so the same content gives the same page and the
 * web view doesn't reload. The web view's injected scripts aren't held to it.
 * It also keys the page's messages (`getTappedLink`), since nothing outside
 * the template's scripts can read it.
 */
export const getScriptNonce = () =>
  (scriptNonce ??= globalThis.crypto.randomUUID().replaceAll('-', ''));

/**
 * The URL of a link tapped in the page, from a message the template's own
 * script sent (`preval/linkTaps.js`, Android); undefined for anything else,
 * such as a height or a message from a frame inside the content.
 */
export const getTappedLink = (data: string): string | undefined => {
  let message: unknown;
  try {
    message = JSON.parse(data);
  } catch {
    return undefined;
  }
  if (
    message &&
    typeof message === 'object' &&
    'type' in message &&
    message.type === 'link' &&
    'key' in message &&
    message.key === getScriptNonce() &&
    'url' in message &&
    typeof message.url === 'string'
  ) {
    return message.url;
  }
  return undefined;
};
