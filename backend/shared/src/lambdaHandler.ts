import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { createErrorResponse } from "./utils";
import { getCorsHeaders } from "./cors";

/**
 * Lambda function wrapper that handles common functionality.
 *
 * @param handler - Function containing the core business logic.
 * @returns AWS Lambda function with API Gateway proxy integration.
 *
 * The wrapper function performs the following tasks:
 * 1. Logs the incoming request details.
 * 2. Retrieves and validates CORS headers based on the request origin.
 * 3. Handles preflight (OPTIONS) requests.
 * 4. Executes the provided handler function with the event and headers.
 * 5. Catches and returns an error response if the handler execution fails.
 *
 * @example
 * ```typescript
 * const myHandler = async (event: APIGatewayProxyEvent, headers: any) => {
 *   // Your business logic here
 * };
 * 
 * export const main = lambdaHandler(myHandler);
 * ```
 */
export const lambdaHandler = (handler: Function) => {
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
      return {
        statusCode: 403,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: "Forbidden" }),
      };
    }

    // Handle preflight requests
    if (event.httpMethod === "OPTIONS") {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: "Preflight request successful" }),
      };
    }

    try {
      await handler(event, headers);
    } catch (error) {
      return createErrorResponse(
        500,
        "Internal server error while creating product",
        headers
      );
    }
  };
};
