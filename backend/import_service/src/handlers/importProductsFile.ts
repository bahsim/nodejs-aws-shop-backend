import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { lambdaHandler } from "../../../shared/src/lambdaHandler";
import { CorsHeaders } from "../../../shared/src/types";
import { createResponse } from "../../../shared/src/utils";
import { Configuration } from "../../../shared/src/config";
import {
  EnvironmentRequiredVariables,
  VALID_FILENAME_REGEX,
} from "../constants";

const s3Client = new S3Client({});

/**
 * Handler for importing product files.
 * 
 * This function is a Lambda handler that processes an incoming API Gateway event to generate a signed URL for uploading a file to S3.
 * 
 * @param event - The API Gateway event containing the request details.
 * @param headers - The CORS headers to be included in the response.
 * @returns A promise that resolves to an API Gateway proxy result containing the signed URL or an error response.
 */
export const importProductsFile = lambdaHandler(
  async (
    event: APIGatewayProxyEvent,
    headers: CorsHeaders
  ): Promise<APIGatewayProxyResult> => {
    const fileName = (
      event.queryStringParameters?.name ?? ""
    ).toLocaleLowerCase();
    const validationResult = validateFileName(fileName, headers);

    if (validationResult) {
      return validationResult;
    }

    const command = createPutObjectCommand(fileName);

    const signedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600,
    });

    return createResponse(200, { signedUrl }, headers);
  }
);

/**
 * Creates a new `PutObjectCommand` for uploading a file to an S3 bucket.
 *
 * @param fileName - The name of the file to be uploaded.
 * @returns A `PutObjectCommand` configured with the specified file name and other necessary parameters.
 */
function createPutObjectCommand(fileName: string): PutObjectCommand {
  const config = Configuration.getConfig(EnvironmentRequiredVariables);

  return new PutObjectCommand({
    Bucket: config.bucketName,
    Key: `${config.uploadFolder}/${fileName}`,
    ContentType: "text/csv",
  });
}

/**
 * Validates the provided file name according to several criteria:
 * - The file name must be defined and not empty.
 * - The file name must not exceed 255 characters.
 * - The file name must have a `.csv` extension.
 * - The file name must match a predefined regular expression for valid file names.
 * - The file name must not contain path traversal sequences (`../` or `..\\`).
 * - The environment configuration must include a valid `bucketName` and `uploadFolder`.
 *
 * @param fileName - The name of the file to validate.
 * @param headers - The CORS headers to include in the response.
 * @returns An APIGatewayProxyResult with a 400 status code if the file name is invalid,
 *          a 500 status code if the environment configuration is missing required variables,
 *          or `null` if the file name is valid.
 */
function validateFileName(
  fileName: string | undefined,
  headers: CorsHeaders
): APIGatewayProxyResult | null {
  const config = Configuration.getConfig(EnvironmentRequiredVariables);

  if (!fileName || fileName.trim().length === 0) {
    return createResponse(400, { message: "Filename is required" }, headers);
  }

  if (fileName.length > 255) {
    return createResponse(400, { message: "Filename too long" }, headers);
  }

  if (!fileName.toLowerCase().endsWith(".csv")) {
    return createResponse(
      400,
      { message: "Only CSV files are supported" },
      headers
    );
  }

  if (!VALID_FILENAME_REGEX.test(fileName)) {
    return createResponse(400, { message: "Invalid file name" }, headers);
  }

  // Security check for path traversal
  if (fileName.includes("../") || fileName.includes("..\\")) {
    return createResponse(400, { message: "Invalid file name" }, headers);
  }

  console.log("config", config);

  // Environment variable validation
  if (!config.bucketName) {
    return createResponse(
      500,
      { message: "Missing bucket configuration" },
      headers
    );
  }

  if (!config.uploadFolder) {
    return createResponse(
      500,
      { message: "Missing upload folder configuration" },
      headers
    );
  }

  return null;
}
