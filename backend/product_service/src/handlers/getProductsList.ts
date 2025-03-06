import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { lambdaHandler } from "../../../shared/src/lambdaHandler";
import { CorsHeaders } from "../../../shared/src/types";
import { Configuration } from "../../../shared/src/config";
import { createResponse } from "../../../shared/src/utils";
import { EnvironmentRequiredVariables } from "../constants";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const config = Configuration.getConfig(EnvironmentRequiredVariables);

/**
 * Handler for retrieving a list of products with their stock counts.
 * 
 * This function scans the products and stocks tables, joins the products with their corresponding stock counts,
 * and returns the result as an HTTP response.
 * 
 * @param event - The API Gateway proxy event.
 * @param headers - The CORS headers to include in the response.
 * @returns A promise that resolves to an API Gateway proxy result containing the list of products with their stock counts.
 */
export const getProductsList = lambdaHandler(
  async (
    event: APIGatewayProxyEvent,
    headers: CorsHeaders
  ): Promise<APIGatewayProxyResult> => {
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
      stocksResult.Items?.map((stock) => [stock.product_id, stock.count])
    );

    // Join products with their stock counts
    const joinedProducts = productsResult.Items?.map((product) => ({
      id: product.id,
      title: product.title,
      description: product.description,
      price: product.price,
      count: stocksMap.get(product.id) || 0,
    }));

    return createResponse(200, joinedProducts ?? {}, headers);
  }
);
