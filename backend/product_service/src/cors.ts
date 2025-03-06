import { ALLOWED_ORIGINS } from "./constants";
import { CorsHeaders } from "./types";

export const DEFAULT_CORS_HEADERS: CorsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGINS[0],
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
};

export function getCorsOrigin(origin: string | undefined): string {
  if (!origin) return ALLOWED_ORIGINS[0];
  return ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
}

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
