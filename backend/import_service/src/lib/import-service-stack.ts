// import-service-stack.ts
import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3n from "aws-cdk-lib/aws-s3-notifications";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as nodejs from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import * as path from "path";
import { Configuration } from "../../../shared/src/config";

const config = Configuration.getConfig();

export class ImportServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const environment = {
      FRONTEND_URL: config.frontendUrl || "",
      DEBUG_MODE: config.debug || "",
      REGION: config.region || "",
      BUCKET_NAME: "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      UPLOAD_FOLDER: "uploaded",
      PARSED_FOLDER: "parsed",
    };

    // Create S3 bucket for storing product files
    const bucket = new s3.Bucket(this, "XXXXXXXXXXXXXXXXXXXXXXXXXXX", {
      bucketName: environment.BUCKET_NAME,
      cors: [
        {
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.PUT,
            s3.HttpMethods.POST,
          ],
          allowedOrigins: ["*"],
          allowedHeaders: ["*"],
        },
      ],
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For dev environments only
      autoDeleteObjects: true, // For dev environments only
    });

    // Create Lambda functions
    const importProductsFile = new nodejs.NodejsFunction(
      this,
      "ImportProductsFile",
      {
        runtime: lambda.Runtime.NODEJS_18_X,
        functionName: "ImportProductsFile",
        entry: path.join(__dirname, "../handlers/importProductsFile.ts"),
        handler: "importProductsFile",
        environment: {
          ...environment,
        },
      }
    );

    const importFileParser = new nodejs.NodejsFunction(this, "ImportFileParser", {
      runtime: lambda.Runtime.NODEJS_18_X,
      functionName: "ImportFileParser",
      entry: path.join(__dirname, "../handlers/importFileParser.ts"),
      handler: "importFileParser",
      environment: {
        ...environment,
      },
    });

    // Grant S3 permissions
    bucket.grantReadWrite(importProductsFile);
    bucket.grantRead(importFileParser);
    
    // Grant permission to move files between folders
    importFileParser.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["s3:PutObject", "s3:DeleteObject"],
        resources: [
          `${bucket.bucketArn}/${environment.UPLOAD_FOLDER}/*`,
          `${bucket.bucketArn}/${environment.PARSED_FOLDER}/*`,
        ],
      })
    );

    // Configure S3 event notification
    bucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(importFileParser),
      { prefix: environment.UPLOAD_FOLDER + '/' }  // Only trigger for objects in 'uploaded' folder
    );

    // Create API Gateway with CORS
    const api = new apigateway.RestApi(this, "ImportApi", {
      restApiName: "Import Service",
      defaultCorsPreflightOptions: {
        allowOrigins: ["http://localhost:3000", config.frontendUrl],
        allowMethods: ["GET", "OPTIONS"],
        allowHeaders: [
          "Content-Type",
          "X-Amz-Date",
          "Authorization",
          "X-Api-Key",
          "X-Amz-Security-Token",
        ],
        allowCredentials: true,
      },
    });

    // Create /import endpoint
    const importResource = api.root.addResource("import");
    importResource.addMethod(
      "GET", 
      new apigateway.LambdaIntegration(importProductsFile),
      {
        requestParameters: {
          'method.request.querystring.name': true,
        },
      }
    );

    // Output the API URL
    new cdk.CfnOutput(this, "ApiUrl", {
      value: api.url,
      description: "API Gateway endpoint URL for Import Service",
    });
  }
}