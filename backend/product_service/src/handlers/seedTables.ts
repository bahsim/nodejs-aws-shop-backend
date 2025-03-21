import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  BatchWriteCommand,
  DynamoDBDocumentClient,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent } from "aws-lambda";
import * as https from "https";
import * as url from "url";
import { Configuration } from "../../../shared/src/config";
import { EnvironmentRequiredVariables } from "../constants";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const config = Configuration.getConfig(EnvironmentRequiredVariables);

const products = [
  {
    id: "8e1f4f96-c5f6-4a88-a10a-7e4b21f578da",
    title: "Logitech MX Master 3",
    description: "Advanced Wireless Mouse",
    price: 99,
  },
  {
    id: "b4c5d8e1-f2a3-4b6c-9d8e-1f2a3b4c5d8e",
    title: "Keychron K2",
    description: "Wireless Mechanical Keyboard",
    price: 79,
  },
  {
    id: "c7d8e9f0-1a2b-3c4d-5e6f-7a8b9c0d1e2f",
    title: "Dell U2720Q",
    description: "27-inch 4K USB-C Monitor",
    price: 579,
  },
  {
    id: "d1e2f3a4-b5c6-7d8e-9f0a-1b2c3d4e5f6a",
    title: "Jabra Elite 85t",
    description: "True Wireless Earbuds",
    price: 229,
  },
  {
    id: "e5f6a7b8-c9d0-1e2f-3a4b-5c6d7e8f9a0b",
    title: "Samsung T7",
    description: "1TB Portable SSD",
    price: 129,
  },
  {
    id: "f9a0b1c2-d3e4-5f6a-7b8c-9d0e1f2a3b4c",
    title: 'LG 34" Ultrawide',
    description: "34-inch WQHD Curved Gaming Monitor",
    price: 799,
  },
  {
    id: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    title: "Blue Yeti",
    description: "USB Professional Microphone",
    price: 129,
  },
  {
    id: "b5c6d7e8-f9a0-1b2c-3d4e-5f6a7b8c9d0e",
    title: "Logitech C920",
    description: "HD Pro Webcam",
    price: 79,
  },
  {
    id: "c9d0e1f2-a3b4-5c6d-7e8f-9a0b1c2d3e4f",
    title: "Anker USB-C Hub",
    description: "7-in-1 USB-C Data Hub",
    price: 35,
  },
  {
    id: "d3e4f5a6-b7c8-9d0e-1f2a-3b4c5d6e7f8a",
    title: "Sony WH-1000XM4",
    description: "Wireless Noise Cancelling Headphones",
    price: 349,
  },
];

const stocks = products.map((product) => ({
  product_id: product.id,
  count: Math.floor(Math.random() * 10) + 1,
}));

/**
 * Sends a response to the provided CloudFormation response URL.
 *
 * @param event - The event object containing details about the CloudFormation request.
 * @param status - The status of the response, typically "SUCCESS" or "FAILED".
 * @param reason - Optional. A string providing the reason for the status. Defaults to "See CloudWatch logs for details".
 * @returns A promise that resolves when the response has been successfully sent, or rejects if an error occurs.
 */
const sendResponse = async (event: any, status: string, reason?: string) => {
  const responseBody = JSON.stringify({
    Status: status,
    Reason: reason || "See CloudWatch logs for details",
    PhysicalResourceId: event.LogicalResourceId || "SeedingComplete",
    StackId: event.StackId,
    RequestId: event.RequestId,
    LogicalResourceId: event.LogicalResourceId,
    Data: {},
  });

  const parsedUrl = url.parse(event.ResponseURL);
  const options = {
    hostname: parsedUrl.hostname,
    port: 443,
    path: parsedUrl.path,
    method: "PUT",
    headers: {
      "Content-Type": "",
      "Content-Length": responseBody.length,
    },
  };

  return new Promise((resolve, reject) => {
    const request = https.request(options, (response) => {
      response.on("end", () => resolve(undefined));
    });

    request.on("error", (error) => reject(error));
    request.write(responseBody);
    request.end();
  });
};

export const seedTables = async (event: APIGatewayProxyEvent) => {
  // Log incoming request and arguments
  console.log("Incoming request:", {
    path: event.path,
    method: event.httpMethod,
    headers: event.headers,
    queryStringParameters: event.queryStringParameters,
  });

  try {
    // Check existing products
    const existingProducts = await docClient.send(
      new ScanCommand({
        TableName: config.productsTableName,
      })
    );

    // Filter out products that already exist
    const existingIds = new Set(existingProducts.Items?.map((item) => item.id));
    const newProducts = products.filter(
      (product) => !existingIds.has(product.id)
    );
    const newStocks = stocks.filter((stock) =>
      newProducts.some((product) => product.id === stock.product_id)
    );

    if (newProducts.length === 0) {
      console.log("No new products to seed");
      await sendResponse(event, "SUCCESS", "No new products to seed");
      return;
    }

    // Prepare batch requests for new products only
    const productRequests = newProducts.map((product) => ({
      PutRequest: {
        Item: product,
      },
    }));

    const stockRequests = newStocks.map((stock) => ({
      PutRequest: {
        Item: stock,
      },
    }));

    // Execute batch write for products
    if (productRequests.length > 0) {
      await docClient.send(
        new BatchWriteCommand({
          RequestItems: {
            [config.productsTableName]: productRequests,
          },
        })
      );
    }

    // Execute batch write for stocks
    if (stockRequests.length > 0) {
      await docClient.send(
        new BatchWriteCommand({
          RequestItems: {
            [config.stocksTableName]: stockRequests,
          },
        })
      );
    }

    console.log(`Successfully seeded ${newProducts.length} new products`);
    await sendResponse(
      event,
      "SUCCESS",
      `Seeded ${newProducts.length} new products`
    );
  } catch (error) {
    console.error("Error seeding tables:", error);
    await sendResponse(
      event,
      "FAILED",
      error instanceof Error ? error.message : "Unknown error"
    );
    throw error;
  }
};
