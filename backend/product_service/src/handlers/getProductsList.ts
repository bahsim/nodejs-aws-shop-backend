import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { Configuration } from "../config";
import { getCorsHeaders } from "../cors";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export const getProductsListLambdaHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const origin = event?.headers?.origin || "";
  const config = Configuration.getConfig();

  const headers = getCorsHeaders(origin);

  try {
    // Get all products
    const productsResult = await docClient.send(
      new ScanCommand({
        TableName: config.productsTableName,
      })
    );

    // Get all stocks
    const stocksResult = await docClient.send(
      new ScanCommand({
        TableName: config.stocksTableName,
      })
    );

    // Create a map of stocks by product_id
    const stocksMap = new Map(
      stocksResult.Items?.map(stock => [stock.product_id, stock.count])
    );

    // Join products with their stock counts
    const joinedProducts = productsResult.Items?.map(product => ({
      id: product.id,
      title: product.title,
      description: product.description,
      price: product.price,
      count: stocksMap.get(product.id) || 0
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(joinedProducts),
    };
  } catch (error) {
    console.error('Error fetching products:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: "Internal server error" }),
    };
  }
};
