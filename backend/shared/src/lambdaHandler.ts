import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { createResponse } from "./utils";
import { getCorsHeaders } from "./cors";
import { LambdaHandlerType } from "./types";

/**
 * A higher-order function that wraps a Lambda handler to provide common functionality
 * such as logging, CORS headers, and error handling.
 *
 * @param handler - The actual Lambda handler function to be executed.
 * @returns A new Lambda handler function with the added functionality.
 *
 * The returned handler function performs the following tasks:
 * 1. Logs the incoming request details.
 * 2. Retrieves and validates CORS headers based on the request origin.
 * 3. Handles preflight OPTIONS requests.
 * 4. Executes the provided handler function and returns its result.
 * 5. Catches any errors thrown by the handler and returns a 500 response.
 *
 * @example
 * ```typescript
 * const myHandler = async (event: APIGatewayProxyEvent, headers: any): Promise<APIGatewayProxyResult> => {
 *   // Your handler logic here
 * };
 *
 * export const main = lambdaHandler(myHandler);
 * ```
 *
 * @param event - The API Gateway proxy event object.
 * @returns A promise that resolves to an API Gateway proxy result object.
 */
export const lambdaHandler =
  (handler: LambdaHandlerType) =>
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    console.log("Incoming request:", {
      path: event.path,
      method: event.httpMethod,
      headers: event.headers,
      queryStringParameters: event.queryStringParameters,
      body: event.body,
    });

    const origin = event?.headers?.origin || "";
    const headers = getCorsHeaders(origin);

    if (!headers) {
      return createResponse(403, "Forbidden", {
        "Content-Type": "application/json",
      });
    }

    // Handle preflight requests
    if (event.httpMethod === "OPTIONS") {
      return createResponse(200, "Preflight request successful", headers);
    }

    try {
      return await handler(event, headers);
    } catch (error) {
      return createResponse(
        500,
        "Internal server error while creating product",
        headers
      );
    }
  };
