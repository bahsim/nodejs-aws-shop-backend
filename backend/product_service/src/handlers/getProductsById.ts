import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { Configuration } from "../../../shared/src/config";
import { lambdaHandler } from "../../../shared/src/lambdaHandler";
import { CorsHeaders } from "../../../shared/src/types";
import { createResponse } from "../../../shared/src/utils";
import { EnvironmentRequiredVariables } from "../constants";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const config = Configuration.getConfig(EnvironmentRequiredVariables);

/**
 * Lambda handler to get product details by product ID.
 *
 * @param {APIGatewayProxyEvent} event - The API Gateway event containing the request data.
 * @param {CorsHeaders} headers - The CORS headers to include in the response.
 * @returns {Promise<APIGatewayProxyResult>} The API Gateway proxy result containing the product details or an error message.
 *
 * @remarks
 * This function retrieves product details from the products table and stock information from the stocks table.
 * If the product ID is not provided or the product is not found, it returns an appropriate error response.
 * The product details and stock information are combined into a single response object.
 *
 * @example
 * // Example event object
 * const event = {
 *   pathParameters: {
 *     productId: '123'
 *   }
 * };
 * 
 * // Example headers object
 * const headers = {
 *   'Access-Control-Allow-Origin': '*'
 * };
 * 
 * // Calling the handler
 * const result = await getProductsById(event, headers);
 * 
 * // Example result
 * {
 *   statusCode: 200,
 *   body: '{"id":"123","title":"Product Title","description":"Product Description","price":100,"count":10}',
 *   headers: {
 *     'Access-Control-Allow-Origin': '*'
 *   }
 * }
 */
export const getProductsById = lambdaHandler(
  async (
    event: APIGatewayProxyEvent,
    headers: CorsHeaders
  ): Promise<APIGatewayProxyResult> => {
    const productId = event.pathParameters?.productId;

    if (!productId) {
      return createResponse(400, "Product ID is required", headers);
    }

    // Get product details
    const productResult = await docClient.send(
      new GetCommand({
        TableName: config.productsTableName,
        Key: { id: productId },
      })
    );

    if (!productResult?.Item) {
      return createResponse(404, "Product not found", headers);
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

    return createResponse(200, JSON.stringify(product), headers);
  }
);
