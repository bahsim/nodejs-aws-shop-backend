import { EnvironmentVariables } from "./types";
import * as dotenv from "dotenv";

dotenv.config();

/**
 * The Configuration class is responsible for validating and retrieving
 * environment variables required for the application to function correctly.
 */
export class Configuration {
  /**
   * Validates the required environment variables.
   *
   * This method checks if the necessary environment variables are set.
   * If any of the required environment variables are missing, it throws an error.
   *
   * @returns {EnvironmentVariables} The environment variables cast to the `EnvironmentVariables` type.
   * @throws {Error} If any of the required environment variables are missing.
   */
  private static validateEnv(required: string[]): EnvironmentVariables {
    for (const item of required) {
      if (!process.env[item]) {
        throw new Error(`Missing required environment variable: ${item}`);
      }
    }

    return process.env as unknown as EnvironmentVariables;
  }

  /**
   * Retrieves the configuration settings from the environment variables.
   *
   * @returns An object containing the following properties:
   * - `frontendUrl`: The URL of the frontend application.
   * - `productsTableName`: The name of the products table in the database.
   * - `stocksTableName`: The name of the stocks table in the database.
   * - `debug`: A boolean indicating whether debug mode is enabled.
   * - `region`: The AWS region, defaulting to 'eu-west-1' if not specified.
   */
  public static getConfig(required: string[] = []) {
    const env = this.validateEnv(required);

    return {
      frontendUrl: env.FRONTEND_URL,
      productsTableName: env.PRODUCTS_TABLE_NAME,
      stocksTableName: env.STOCKS_TABLE_NAME,
      debug: env.DEBUG_MODE,
      region: env.REGION || "eu-west-1",
      stage: env.STAGE || "prod",
      bucketName: env.BUCKET_NAME || "bahsim-import-service",
      uploadFolder: env.UPLOAD_FOLDER || "uploaded",
      parsedFolder: env.PARSED_FOLDER || "parsed",
      snsTopicArn: env.SNS_TOPIC_ARN,
      emailSubscription: env.EMAIL_SUBSCRIPTION || "",
      emailSubscription2: env.EMAIL_SUBSCRIPTION2 || "",
      emailSubscription3: env.EMAIL_SUBSCRIPTION3 || "",
      sqsQueueUrl: env.SQS_QUEUE_URL || "",
    };
  }
}
