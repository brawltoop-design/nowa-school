import { recordMessageOpened } from "@/server/automations/engine";

const transparentGif = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==",
  "base64",
);

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  await recordMessageOpened(id);

  return new Response(transparentGif, {
    headers: {
      "content-type": "image/gif",
      "cache-control": "no-store, max-age=0",
      "content-length": String(transparentGif.length),
    },
  });
}
