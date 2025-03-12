import { S3Event } from "aws-lambda";
import {
  S3Client,
  GetObjectCommand,
  CopyObjectCommand,
  DeleteObjectCommand,
  S3ServiceException,
} from "@aws-sdk/client-s3";
import csvParser from "csv-parser";
import { Readable } from "stream";
import { Configuration } from "../../../shared/src/config";
import { EnvironmentRequiredVariables } from "../constants";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";

const sqsClient = new SQSClient({});
const s3Client = new S3Client({});

/**
 * Handler for parsing files imported to an S3 bucket.
 *
 * This function processes S3 events, retrieves the file from the S3 bucket,
 * converts the file stream to a buffer, processes the CSV content, and moves
 * the file to a parsed folder within the bucket.
 *
 * @param {S3Event} event - The S3 event containing records of the files to be processed.
 * @returns {Promise<void>} - A promise that resolves when the processing is complete.
 *
 * @throws {S3ServiceException} - If there is an error with the S3 service.
 * @throws {Error} - For general errors during processing.
 */
export const importFileParser = async (event: S3Event): Promise<void> => {
  if (!event.Records || event.Records.length === 0) {
    console.log("No records in event, skipping processing");
    return;
  }

  try {
    const config = Configuration.getConfig(EnvironmentRequiredVariables);

    for (const record of event.Records) {
      const bucket = record.s3?.bucket.name;
      const key = decodeURIComponent(record.s3?.object.key.replace(/\+/g, " "));

      if (!bucket || !key) {
        throw new Error("Missing bucket or key in S3 event");
      }

      if (!key.startsWith(config.uploadFolder)) {
        return;
      }

      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      });

      const response = await s3Client.send(command);

      if (!response.Body) {
        throw new Error(`Failed to get stream for ${key}`);
      }

      // Convert stream to buffer first
      const bodyContents = await streamToBuffer(response.Body);

      // Create readable stream from buffer
      const readableStream = Readable.from(bodyContents);

      await processCSVStream(readableStream, key);

      const targetKey = key.replace(config.uploadFolder, config.parsedFolder);

      await moveFile(bucket, key, targetKey);
    }
  } catch (error) {
    console.log("Caught error:", error); // Add this line
    if (error instanceof S3ServiceException) {
      console.error(`S3 Service Error: ${error.message}`);
      throw error; // Rethrow to maintain the error state
    } else if (error instanceof Error) {
      console.error(`General error: ${error.message}`);
      throw error;
    } else {
      throw new Error("Unknown error occurred");
    }
  }
};

/**
 * Converts a readable stream into a Buffer.
 *
 * @param {any} stream - The readable stream to convert.
 * @returns {Promise<Buffer>} A promise that resolves to a Buffer containing the data from the stream.
 */
async function streamToBuffer(stream: any): Promise<Buffer> {
  const chunks: Buffer[] = [];

  return new Promise((resolve, reject) => {
    stream.on("data", (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
    stream.on("error", (err: Error) => reject(err));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

/**
 * Processes a readable CSV stream, parses each row, and sends each parsed row as a message to an SQS queue.
 *
 * @param readableStream - The readable stream containing the CSV data.
 * @param key - The key associated with the CSV file being processed.
 * @returns A promise that resolves when the CSV parsing and message sending is complete.
 *
 * @throws Will reject the promise if there is an error parsing the CSV.
 *
 * The function performs the following steps:
 * 1. Reads the CSV data from the provided readable stream.
 * 2. Parses each row of the CSV, converting numeric strings to numbers.
 * 3. Sends each parsed row as a message to an SQS queue.
 * 4. Logs the total number of rows processed.
 *
 * Note: If an error occurs while sending a message to SQS, the error is logged, but the processing continues for other rows.
 */
async function processCSVStream(
  readableStream: Readable,
  key: string
): Promise<void> {
  const config = Configuration.getConfig(EnvironmentRequiredVariables);

  return new Promise((resolve, reject) => {
    const results: Record<string, unknown>[] = [];

    readableStream
      .pipe(
        csvParser({
          mapHeaders: ({ header }) => {
            // Clean the BOM from header if it exists and return the cleaned header
            return header.replace(/^\uFEFF/, "");
          },
          mapValues: ({ header, value }) => {
            // Convert numeric strings to numbers
            if (!isNaN(value as any) && value !== "") {
              return parseFloat(value);
            }
            return value;
          },
          strict: true, // Enable strict mode to catch malformed CSV
        })
      )
      .on("data", async (data: Record<string, string | number>) => {
        console.log("Processing row:", data);

        try {
          await sqsClient.send(
            new SendMessageCommand({
              QueueUrl: config.sqsQueueUrl,
              MessageBody: JSON.stringify(data),
            })
          );
          results.push(data);
        } catch (error) {
          console.error("Error sending message to SQS:", error);
          // Continue processing other records even if one fails
        }
      })
      .on("end", () => {
        console.log(`CSV parsing complete for ${key}`);
        console.log("Total rows processed:", results.length);
        resolve();
      })
      .on("error", (error: Error) => {
        console.error("Error parsing CSV:", error);
        reject(error);
      });
  });
}

/**
 * Moves a file from one location to another within the same S3 bucket.
 *
 * This function first copies the file to the new location and then deletes the original file.
 *
 * @param bucket - The name of the S3 bucket.
 * @param sourceKey - The key (path) of the source file to be moved.
 * @param targetKey - The key (path) of the target location where the file should be moved.
 * @returns A promise that resolves when the file has been successfully moved.
 * @throws An error if the file could not be moved.
 */
async function moveFile(
  bucket: string,
  sourceKey: string,
  targetKey: string
): Promise<void> {
  try {
    // Copy the file to new location
    await s3Client.send(
      new CopyObjectCommand({
        Bucket: bucket,
        CopySource: `${bucket}/${sourceKey}`,
        Key: targetKey,
      })
    );

    // Delete the original file
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: sourceKey,
      })
    );

    console.log(`Successfully moved file from ${sourceKey} to ${targetKey}`);
  } catch (error) {
    console.error("Error moving file:", error);
    throw error;
  }
}
