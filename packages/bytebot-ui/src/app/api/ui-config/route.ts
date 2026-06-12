import { getDocsBaseUrl } from "../../../lib/backendUrls";

export const dynamic = "force-dynamic";

export function GET(): Response {
  return Response.json({
    docsBaseUrl: getDocsBaseUrl(),
  });
}
