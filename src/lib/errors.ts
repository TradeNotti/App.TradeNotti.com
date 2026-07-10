// Turn any thrown value into ONE short, human sentence for display — never a
// wall of technical red text (stack traces, JSON blobs, multi-line dumps).
// Collapses whitespace, keeps the first readable sentence, and caps length.
export function cleanErrorMessage(
  err: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  let msg = "";
  if (typeof err === "string") {
    msg = err;
  } else if (err && typeof err === "object") {
    const e = err as {
      message?: unknown;
      error?: unknown;
      errors?: { longMessage?: string; message?: string }[];
    };
    if (typeof e.errors?.[0]?.message === "string") msg = e.errors[0].message;
    else if (typeof e.message === "string") msg = e.message;
    else if (typeof e.error === "string") msg = e.error;
  }

  // One line: collapse any newlines/tabs/runs of spaces.
  msg = msg.replace(/\s+/g, " ").trim();

  // Looks technical (JSON/array/stack/duplicated "Error:")? Keep only the first
  // sentence if it reads cleanly, otherwise fall back to the friendly default.
  const technical = /[{}[\]]|\bat \S+:\d+|Error:.*Error:|https?:\/\//.test(msg);
  if (!msg || technical || msg.length > 160) {
    const firstSentence = msg.split(/(?<=[.!?])\s/)[0]?.trim() ?? "";
    if (
      firstSentence &&
      firstSentence.length <= 140 &&
      !/[{}[\]]/.test(firstSentence)
    ) {
      return firstSentence;
    }
    return fallback;
  }

  return msg;
}
