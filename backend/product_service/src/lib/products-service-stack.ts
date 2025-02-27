// product-service-stack.ts
import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as nodejs from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import * as path from "path";
import { Configuration } from "../config";

const config = Configuration.getConfig();

export class ProductServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    
    const environment = {
      FRONTEND_URL: config.frontendUrl || "",
      DATABASE_URL: config.databaseUrl || "",
      DEBUG_MODE: config.debug || "",
      REGION: config.region || "",
    }

    // Create Lambda functions
    const getProductsList = new nodejs.NodejsFunction(this, "GetProductsList", {
      runtime: lambda.Runtime.NODEJS_18_X,
      functionName: "GetProductsList",
      entry: path.join(__dirname, "../handlers/getProductsList.ts"),
      handler: "handler",
      environment,
    });

    const getProductsById = new nodejs.NodejsFunction(this, "GetProductsById", {
      runtime: lambda.Runtime.NODEJS_18_X,
      functionName: "GetProductsById",
      entry: path.join(__dirname, "../handlers/getProductsById.ts"),
      handler: "handler",
      environment,
    });

    // Create API Gateway with CORS
    const api = new apigateway.RestApi(this, "ProductsApi", {
      restApiName: "Products Service",
      defaultCorsPreflightOptions: {
        allowOrigins: ["http://localhost:3000"], // Add your frontend URL here
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

    // Create /products endpoint
    const products = api.root.addResource("products");
    products.addMethod(
      "GET",
      new apigateway.LambdaIntegration(getProductsList)
    );

    // Create /products/{productId} endpoint
    const product = products.addResource("{productId}");
    product.addMethod("GET", new apigateway.LambdaIntegration(getProductsById));

    // Output the API URL
    new cdk.CfnOutput(this, "ApiUrl", {
      value: api.url,
      description: "API Gateway endpoint URL",
    });
  }
}
