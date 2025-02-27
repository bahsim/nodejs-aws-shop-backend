import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { products } from "../mockData";
import { ALLOWED_ORIGINS, CORS_HEADERS } from "../constants";
import { Configuration } from "../config";
import { getCorsHeaders } from "../cors";

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const origin = event?.headers?.origin || "";
  const config = Configuration.getConfig();
  // const dbConfig = Configuration.getDatabaseConfig();

   // Use configuration in your logic
   if (config.debug) {
    console.log('Debug mode enabled');
    // console.log('Database config:', dbConfig);
  }

  const headers = getCorsHeaders(origin);

  try {
    const productId = event.pathParameters?.productId;

    if (!productId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: "Product ID is required" }),
      };
    }

    const product = products.find((p) => p.id === productId);

    if (!product) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ message: "Product not found" }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(product),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
};
