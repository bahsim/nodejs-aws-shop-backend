import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { lambdaHandler } from "../../../shared/src/lambdaHandler";
import { CorsHeaders } from "../../../shared/src/types";
import { createErrorResponse } from "../../../shared/src/utils";
import { Configuration } from "../../../shared/src/config";

const s3Client = new S3Client({});
const config = Configuration.getConfig();

export const importProductsFile = lambdaHandler(
  async (
    event: APIGatewayProxyEvent,
    headers: CorsHeaders
  ): Promise<APIGatewayProxyResult> => {
    console.log("importProductsFile lambda invoked with event:", event);
    
    try {
      const fileName = event.queryStringParameters?.name;
      
      if (!fileName) {
        console.error("Filename is required");
        return createErrorResponse(
          400,
          { message: "Filename is required" },
          headers
        );
      }
      
      const bucketName = process.env.BUCKET_NAME;
      const uploadFolder = process.env.UPLOAD_FOLDER || "uploaded";
      const key = `${uploadFolder}/${fileName}`;
      
      console.log(`Generating signed URL for bucket: ${bucketName}, key: ${key}`);
      
      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        ContentType: "text/csv"
      });
      
      const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
      
      console.log(`Generated signed URL: ${signedUrl}`);
      
      // Return just the URL string as requested
      return {
        statusCode: 200,
        headers,
        body: signedUrl
      };
      
    } catch (error) {
      console.error("Error generating signed URL:", error);
      return createErrorResponse(
        500,
        { message: "Error generating signed URL", error },
        headers
      );
    }
  }
);