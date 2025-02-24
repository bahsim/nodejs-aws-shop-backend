import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  BatchWriteCommand,
  DynamoDBDocumentClient,
  PutCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import * as https from 'https';
import * as url from 'url';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const products = [
  {
    id: "1",
    title: "Logitech MX Master 3",
    description: "Advanced Wireless Mouse",
    price: 99,
  },
  {
    id: "2",
    title: "Keychron K2",
    description: "Wireless Mechanical Keyboard",
    price: 79,
  },
  {
    id: "3",
    title: "Dell U2720Q",
    description: "27-inch 4K USB-C Monitor",
    price: 579,
  },
  {
    id: "4",
    title: "Jabra Elite 85t",
    description: "True Wireless Earbuds",
    price: 229,
  },
  {
    id: "5",
    title: "Samsung T7",
    description: "1TB Portable SSD",
    price: 129,
  },
];

const stocks = products.map((product) => ({
  product_id: product.id,
  count: Math.floor(Math.random() * 10) + 1,
}));

// Helper function to send response to CloudFormation
const sendResponse = async (event: any, status: string, reason?: string) => {
  const responseBody = JSON.stringify({
    Status: status,
    Reason: reason || 'See CloudWatch logs for details',
    PhysicalResourceId: event.LogicalResourceId || 'SeedingComplete',
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
    method: 'PUT',
    headers: {
      'Content-Type': '',
      'Content-Length': responseBody.length,
    },
  };

  return new Promise((resolve, reject) => {
    const request = https.request(options, (response) => {
      response.on('end', () => resolve(undefined));
    });

    request.on('error', (error) => reject(error));
    request.write(responseBody);
    request.end();
  });
};

export const seedTablesLambdaHandler = async (event: any) => {
  try {
    if (event.RequestType === "Delete") {
      await sendResponse(event, 'SUCCESS');
      return;
    }

    // Check existing products
    const existingProducts = await docClient.send(
      new ScanCommand({
        TableName: "products",
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
      await sendResponse(event, 'SUCCESS', 'No new products to seed');
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
            ["products"]: productRequests,
          },
        })
      );
    }

    // Execute batch write for stocks
    if (stockRequests.length > 0) {
      await docClient.send(
        new BatchWriteCommand({
          RequestItems: {
            [process.env.STOCKS_TABLE!]: stockRequests,
          },
        })
      );
    }

    console.log(`Successfully seeded ${newProducts.length} new products`);
    await sendResponse(event, 'SUCCESS', `Seeded ${newProducts.length} new products`);

  } catch (error) {
    console.error("Error seeding tables:", error);
    await sendResponse(event, 'FAILED', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
};
