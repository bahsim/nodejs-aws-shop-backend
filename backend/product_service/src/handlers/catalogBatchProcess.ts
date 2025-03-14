// product-service/lambda/catalogBatchProcess/index.ts

import { SQSEvent } from "aws-lambda";
import { EnvironmentRequiredVariables } from "../constants";
import { Configuration } from "../../../shared/src/config";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { PublishCommand, SNSClient } from "@aws-sdk/client-sns";

const ddbClient = new DynamoDB({});
const docClient = DynamoDBDocumentClient.from(ddbClient);
const snsClient = new SNSClient({});

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  count: number;
}

/**
 * Handles the processing of a batch of SQS messages, each containing a product to be added to the database.
 *
 * @param {SQSEvent} event - The SQS event containing the batch of records to process.
 * @returns {Promise<void>} - A promise that resolves when the batch processing is complete.
 *
 * @throws Will throw an error if there is an issue processing the batch.
 *
 * The function performs the following steps:
 * 1. Retrieves the configuration and validates the required environment variables.
 * 2. Iterates over each record in the SQS event.
 * 3. Parses the product data from the record body.
 * 4. Validates the product data.
 * 5. Inserts the product into the DynamoDB table.
 * 6. Publishes a message to an SNS topic indicating the product was created successfully.
 */
export const catalogBatchProcess = async (event: SQSEvent): Promise<void> => {
  try {
    validateEnvironmentVariables();

    for (const record of event.Records) {
      const product = getRecordBody(record);
      validateProduct(product);
      await saveProductToDynamoDB(product);
      await publishProductCreationMessage(product);
    }
  } catch (error) {
    console.error("Error processing batch:", error);
    throw error;
  }
};

/**
 * Validates the required environment variables for the application.
 *
 * This function checks if the necessary environment variables are set.
 * If any of the required environment variables are missing, it throws an error.
 *
 * @throws {Error} If the PRODUCTS_TABLE_NAME environment variable is not set.
 * @throws {Error} If the SNS_TOPIC_ARN environment variable is not set.
 */

function validateEnvironmentVariables() {
  const config = Configuration.getConfig(EnvironmentRequiredVariables);

  if (!config.productsTableName) {
    throw new Error("PRODUCTS_TABLE_NAME environment variable is not set");
  }
  if (!config.snsTopicArn) {
    throw new Error("SNS_TOPIC_ARN environment variable is not set");
  }
}

/**
 * Validates the given product object to ensure it meets the required structure and field constraints.
 *
 * @param product - The product object to validate.
 * @returns A boolean indicating whether the product is valid.
 * @throws Will throw an error if the product data is missing or any required field is invalid.
 *
 * The product object must have the following properties:
 * - `title`: A non-empty string.
 * - `description`: A string.
 * - `price`: A non-negative number.
 * - `count`: A non-negative integer.
 */
function validateProduct(product: Product): product is Product {
  if (!product) throw new Error("Product data is required");

  // Check required fields exist
  if (
    !product.id ||
    !product.title ||
    !product.description ||
    !product.price ||
    !product.count
  ) {
    throw new Error("Missing required fields");
  }

  // Check field types and values
  if (typeof product.title !== "string" || product.title.trim().length === 0) {
    throw new Error("Invalid field value: title must be a non-empty string");
  }

  if (typeof product.description !== "string") {
    throw new Error("Invalid field value: description must be a string");
  }

  if (typeof product.price !== "number" || product.price < 0) {
    throw new Error("Invalid field value: price must be a non-negative number");
  }

  if (
    typeof product.count !== "number" ||
    product.count < 0 ||
    !Number.isInteger(product.count)
  ) {
    throw new Error(
      "Invalid field value: count must be a non-negative integer"
    );
  }

  return true;
}

/**
 * Extracts and parses the body of an SQS record.
 *
 * @param {SQSEvent["Records"][0]} record - The SQS record to extract the body from.
 * @returns {Product} The parsed body of the SQS record.
 * @throws {Error} If the record body is missing.
 */
function getRecordBody(record: SQSEvent["Records"][0]): Product {
  if (!record.body) {
    throw new Error("Record body is missing");
  }

  console.log("Record body:", record.body);
  return JSON.parse(record.body);
}

/**
 * Saves a product to DynamoDB by inserting it into the products table and the stocks table.
 *
 * @param {Product} product - The product to be saved.
 * @returns {Promise<void>} A promise that resolves when the product has been saved.
 *
 * @throws {Error} If there is an issue with saving the product to DynamoDB.
 */
async function saveProductToDynamoDB(product: Product): Promise<void> {
  const config = Configuration.getConfig(EnvironmentRequiredVariables);

  await docClient.send(
    new PutCommand({
      TableName: config.productsTableName,
      Item: {
        id: product.id,
        title: product.title,
        description: product.description,
        price: product.price,
      },
    })
  );

  await docClient.send(
    new PutCommand({
      TableName: config.stocksTableName,
      Item: {
        product_id: product.id,
        count: product.count,
      },
    })
  );
}

/**
 * Publishes a message to an SNS topic indicating that a product has been created successfully.
 *
 * @param {Product} product - The product object that has been created.
 * @returns {Promise<void>} A promise that resolves when the message has been published.
 */
async function publishProductCreationMessage(product: Product): Promise<void> {
  const config = Configuration.getConfig(EnvironmentRequiredVariables);
  const command = new PublishCommand({
    TopicArn: config.snsTopicArn,
    Message: JSON.stringify({
      message: "Product created successfully",
      product,
    }),
  });
  await snsClient.send(command);
}
