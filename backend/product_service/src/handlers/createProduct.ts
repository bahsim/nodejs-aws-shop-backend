// src/handlers/createProduct.ts

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  TransactWriteCommand,
  TransactWriteCommandInput,
} from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { v4 as uuidv4 } from "uuid";
import { Configuration } from "../config";
import { getCorsHeaders } from "../cors";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const createErrorResponse = (
  statusCode: number,
  message: string,
  headers: Record<string, string>
): APIGatewayProxyResult => ({
  statusCode,
  headers,
  body: JSON.stringify({ message })
});

export const createProduct = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  // Log incoming request and arguments
  console.log("Incoming request:", {
    path: event.path,
    method: event.httpMethod,
    headers: event.headers,
    queryStringParameters: event.queryStringParameters,
    body: event.body,
  });

  const origin = event?.headers?.origin || "";
  const headers = getCorsHeaders(origin);
  const config = Configuration.getConfig();

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
    if (!event.body) {
      console.log("Request validation failed: Missing body");
      return createErrorResponse(400, "Product data is required", headers);
    }

    let productData;
    try {
      productData = JSON.parse(event.body);
      console.log("Parsed request body:", productData);
    } catch (e) {
      console.log("Request validation failed: Invalid JSON");
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

    console.log(
      "Executing transaction:",
      JSON.stringify(transactionInput, null, 2)
    );

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

      console.log("Successfully created product and stock:", createdProduct);

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(createdProduct),
      };
    } catch (error) {
      console.error("Transaction failed:", error);

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
  } catch (error) {
    console.error("Error creating product:", error);
    return createErrorResponse(
      500,
      "Internal server error while creating product",
      headers
    );
  }
};
