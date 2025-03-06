import { ALLOWED_ORIGINS } from "./constants";
import { CorsHeaders } from "./types";

export const DEFAULT_CORS_HEADERS: CorsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGINS[0],
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
};

/**
 * Returns the allowed CORS origin based on the provided origin.
 *
 * @param origin - The origin to check against the allowed origins.
 * @returns The allowed origin if it is in the list of allowed origins, otherwise the first allowed origin.
 */
export function getCorsOrigin(origin: string | undefined): string {
  if (!origin) return ALLOWED_ORIGINS[0];
  return ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
}

/**
 * Generates CORS headers based on the provided origin.
 *
 * @param origin - The origin to be used for the CORS headers. It can be a string or undefined.
 * @returns An object containing the default CORS headers along with the "Access-Control-Allow-Origin" header set to the provided origin, or null if the origin is not valid.
 */
export function getCorsHeaders(origin: string | undefined): CorsHeaders | null {
  const corsOrigin = getCorsOrigin(origin);

  // if (!corsOrigin) {
  //   return null;
  // }

  return {
    ...DEFAULT_CORS_HEADERS,
    "Access-Control-Allow-Origin": corsOrigin,
  };
}
