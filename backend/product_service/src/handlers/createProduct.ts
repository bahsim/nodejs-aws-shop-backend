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
import { createErrorResponse } from "../../../shared/src/utils";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const config = Configuration.getConfig();

export const createProduct = lambdaHandler(
  async (
    event: APIGatewayProxyEvent,
    headers: CorsHeaders
  ): Promise<APIGatewayProxyResult> => {
    if (!event.body) {
      return createErrorResponse(400, "Product data is required", headers);
    }

    let productData;
    try {
      productData = JSON.parse(event.body);
    } catch (e) {
      return createErrorResponse(400, "Invalid JSON in request body", headers);
    }

    // Validate required fields
    const { title, description, price, count } = productData;
    if (!title || !description || price === undefined || count === undefined) {
      return createErrorResponse(
        400,
        "Title, description, price, and count are required",
        headers
      );
    }

    // Validate title and description
    if (!title.trim() || !description.trim()) {
      return createErrorResponse(
        400,
        "Title and description cannot be empty",
        headers
      );
    }

    // Validate price and count
    if (typeof price !== "number" || price <= 0) {
      return createErrorResponse(
        400,
        "Price must be a positive number",
        headers
      );
    }

    if (!Number.isInteger(count) || count < 0) {
      return createErrorResponse(
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
          return createErrorResponse(
            409,
            "Product creation failed due to conflict",
            headers
          );
        }
        if (error.name === "ValidationException") {
          return createErrorResponse(
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
