import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  TransactWriteCommand,
  TransactWriteCommandInput,
} from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { v4 as uuidv4 } from "uuid";
import { Configuration } from "../../../shared/src/config";
import { lambdaHandler } from "../../../shared/src/lambdaHandler";
import { CorsHeaders } from "../../../shared/src/types";
import { createResponse } from "../../../shared/src/utils";
import { EnvironmentRequiredVariables } from "../constants";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const config = Configuration.getConfig(EnvironmentRequiredVariables);

/**
 * Handler for creating a new product.
 *
 * This function processes an incoming API Gateway event to create a new product
 * and its associated stock in the database. It performs validation on the input
 * data and ensures that the product and stock do not already exist before
 * attempting to create them.
 *
 * @param event - The API Gateway event containing the request data.
 * @param headers - The CORS headers to include in the response.
 * @returns A promise that resolves to an API Gateway proxy result.
 *
 * @throws Will throw an error if the transaction fails for reasons other than
 *         validation or conflict.
 *
 * @example
 * // Example of a valid request body:
 * // {
 * //   "title": "Sample Product",
 * //   "description": "This is a sample product.",
 * //   "price": 19.99,
 * //   "count": 10
 * // }
 *
 * @example
 * // Example of a successful response:
 * // {
 * //   "statusCode": 201,
 * //   "headers": { ... },
 * //   "body": "{\"id\":\"1234\",\"title\":\"Sample Product\",\"description\":\"This is a sample product.\",\"price\":19.99,\"count\":10}"
 * // }
 */
export const createProduct = lambdaHandler(
  async (
    event: APIGatewayProxyEvent,
    headers: CorsHeaders
  ): Promise<APIGatewayProxyResult> => {
    if (!event.body) {
      return createResponse(400, "Product data is required", headers);
    }

    let productData;
    try {
      productData = JSON.parse(event.body);
    } catch (e) {
      return createResponse(400, "Invalid JSON in request body", headers);
    }

    // Validate required fields
    const { title, description, price, count } = productData;
    if (!title || !description || price === undefined || count === undefined) {
      return createResponse(
        400,
        "Title, description, price, and count are required",
        headers
      );
    }

    // Validate title and description
    if (!title.trim() || !description.trim()) {
      return createResponse(
        400,
        "Title and description cannot be empty",
        headers
      );
    }

    // Validate price and count
    if (typeof price !== "number" || price <= 0) {
      return createResponse(400, "Price must be a positive number", headers);
    }

    if (!Number.isInteger(count) || count < 0) {
      return createResponse(
        400,
        "Count must be a non-negative integer",
        headers
      );
    }

    const productId = uuidv4();

    // Prepare transaction items
    const transactionInput: TransactWriteCommandInput = {
      TransactItems: [
        {
          // Create product
          Put: {
            TableName: config.productsTableName,
            Item: {
              id: productId,
              title: title.trim(),
              description: description.trim(),
              price: Number(price),
            },
            // Ensure product doesn't already exist
            ConditionExpression: "attribute_not_exists(id)",
          },
        },
        {
          // Create stock
          Put: {
            TableName: config.stocksTableName,
            Item: {
              product_id: productId,
              count: Number(count),
            },
            // Ensure stock doesn't already exist
            ConditionExpression: "attribute_not_exists(product_id)",
          },
        },
      ],
    };

    try {
      await docClient.send(new TransactWriteCommand(transactionInput));

      // Prepare response with combined product and stock data
      const createdProduct = {
        id: productId,
        title: title.trim(),
        description: description.trim(),
        price: Number(price),
        count: Number(count),
      };

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(createdProduct),
      };
    } catch (error) {
      // Check for specific transaction errors
      if (error instanceof Error) {
        if (error.name === "TransactionCanceledException") {
          return createResponse(
            409,
            "Product creation failed due to conflict",
            headers
          );
        }
        if (error.name === "ValidationException") {
          return createResponse(
            400,
            "Invalid data for product creation",
            headers
          );
        }
      }

      throw error; // Re-throw for general error handling
    }
  }
);
