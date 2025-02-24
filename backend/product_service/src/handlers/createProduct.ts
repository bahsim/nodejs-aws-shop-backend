import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";
import { Configuration } from "../config";
import { getCorsHeaders } from "../cors";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const origin = event?.headers?.origin || "";
  const config = Configuration.getConfig();

  const headers = getCorsHeaders(origin);

  try {
    if (!event.body) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: "Product data is required" }),
      };
    }

    const productData = JSON.parse(event.body);
    const { title, description, price } = productData;

    // Validate required fields
    if (!title || !description || !price) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          message: "Title, description, and price are required",
        }),
      };
    }

    const product = {
      id: uuidv4(),
      title,
      description,
      price: Number(price),
    };

    await docClient.send(
      new PutCommand({
        TableName: config.productsTableName,
        Item: product,
      })
    );

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify(product),
    };
  } catch (error) {
    console.error("Error creating product:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        message: "Internal server error while creating product",
      }),
    };
  }
};
