import { APIGatewayProxyResult } from "aws-lambda";

/**
 * Creates an error response object for API Gateway.
 *
 * @param statusCode - The HTTP status code for the response.
 * @param message - The error message or an object containing error details.
 * @param headers - The headers to include in the response.
 * @returns An object representing the API Gateway proxy result.
 */
export const createErrorResponse = (
  statusCode: number,
  message: string | Record<string, any>,
  headers: Record<string, string>
): APIGatewayProxyResult => ({
  statusCode,
  headers,
  body: JSON.stringify(typeof message === 'string' ? { message } : message),
});
