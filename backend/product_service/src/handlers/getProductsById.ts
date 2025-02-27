import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { Configuration } from "../../../shared/src/config";
import { lambdaHandler } from "../../../shared/src/lambdaHandler";
import { CorsHeaders } from "../../../shared/src/types";
import { createErrorResponse } from "../../../shared/src/utils";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const config = Configuration.getConfig();

export const getProductsById = lambdaHandler(
  async (
    event: APIGatewayProxyEvent,
    headers: CorsHeaders
  ): Promise<APIGatewayProxyResult> => {
    const productId = event.pathParameters?.productId;

    if (!productId) {
      return createErrorResponse(400, "Product ID is required", headers);
    }

    // Get product details
    const productResult = await docClient.send(
      new GetCommand({
        TableName: config.productsTableName,
        Key: { id: productId },
      })
    );

    if (!productResult?.Item) {
      return createErrorResponse(404, "Product not found", headers);
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
      count: stockResult?.Item?.count || 0,
    };

    return createErrorResponse(200, JSON.stringify(product), headers);
  }
);
