import { APIGatewayProxyResult } from "aws-lambda";

/**
 * Creates an API Gateway Proxy Response.
 *
 * @param statusCode - The HTTP status code for the response.
 * @param message - The message or object to be included in the response body.
 * @param headers - The headers to be included in the response.
 * @returns An object representing the API Gateway Proxy Result.
 */
export const createResponse = (
  statusCode: number,
  message: string | Record<string, any>,
  headers: Record<string, string>
): APIGatewayProxyResult => ({
  statusCode,
  headers,
  body: JSON.stringify(typeof message === 'string' ? { message } : message),
});
