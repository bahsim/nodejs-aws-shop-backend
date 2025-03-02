import { S3Event } from "aws-lambda";
import {
  S3Client,
  GetObjectCommand,
  CopyObjectCommand,
  DeleteObjectCommand
} from "@aws-sdk/client-s3";
import * as csv from "csv-parser";

const s3Client = new S3Client({});

export const importFileParser = async (event: S3Event): Promise<void> => {
  console.log("importFileParser lambda invoked with event:", JSON.stringify(event));
  
  try {
    // Process each record in the S3 event
    for (const record of event.Records) {
      const bucket = record.s3.bucket.name;
      const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));
      
      console.log(`Processing file ${key} from bucket ${bucket}`);
      
      // Skip if the file is not in the uploaded folder
      if (!key.startsWith(process.env.UPLOAD_FOLDER + '/')) {
        console.log(`Skipping file ${key} as it's not in the upload folder`);
        continue;
      }
      
      // Get the S3 object
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key
      });
      
      const response = await s3Client.send(command);
      const stream = response.Body;
      
      if (!stream) {
        throw new Error(`Failed to get stream for ${key}`);
      }
      
      // Process the CSV file using streams
      await new Promise((resolve, reject) => {
        // @ts-ignore - Type issue with the stream from AWS SDK
        stream
          .pipe(csv())
          .on("data", (data: any) => {
            console.log("Parsed CSV row:", JSON.stringify(data));
          })
          .on("end", async () => {
            console.log(`CSV parsing complete for ${key}`);
            
            // Move file to parsed folder
            const targetKey = key.replace(
              process.env.UPLOAD_FOLDER + '/',
              process.env.PARSED_FOLDER + '/'
            );
            
            // Copy the object to the parsed folder
            await s3Client.send(
              new CopyObjectCommand({
                Bucket: bucket,
                CopySource: encodeURIComponent(`${bucket}/${key}`),
                Key: targetKey
              })
            );
            
            // Delete from the uploaded folder
            await s3Client.send(
              new DeleteObjectCommand({
                Bucket: bucket,
                Key: key
              })
            );
            
            console.log(`File moved from ${key} to ${targetKey}`);
            resolve(null);
          })
          .on("error", (error: Error) => {
            console.error("Error parsing CSV:", error);
            reject(error);
          });
      });
      
    }
  } catch (error) {
    console.error("Error processing S3 event:", error);
    throw error;
  }
};