import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { Configuration } from "../config";
import { getCorsHeaders } from "../cors";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export const getProductsByIdLambdaHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  // Log incoming request and arguments
  console.log('Incoming request:', {
    path: event.path,
    method: event.httpMethod,
    headers: event.headers,
    queryStringParameters: event.queryStringParameters
  });

  const origin = event?.headers?.origin || "";
  const config = Configuration.getConfig();
  // const dbConfig = Configuration.getDatabaseConfig();

  // Use configuration in your logic
  if (config.debug) {
    console.log("Debug mode enabled");
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

    // Get product details
    const productResult = await docClient.send(
      new GetCommand({
        TableName: config.productsTableName,
        Key: { id: productId },
      })
    );

    if (!productResult.Item) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ message: "Product not found" }),
      };
    }

    // Get stock information
    const stockResult = await docClient.send(
      new GetCommand({
        TableName: config.stocksTableName,
        Key: { product_id: productId },
      })
    );

    // Combine product and stock information
    const product = {
      id: productResult.Item.id,
      title: productResult.Item.title,
      description: productResult.Item.description,
      price: productResult.Item.price,
      count: stockResult.Item?.count || 0
    };

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
