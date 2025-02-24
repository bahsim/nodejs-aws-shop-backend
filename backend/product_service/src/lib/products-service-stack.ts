// product-service-stack.ts
import * as cdk from "aws-cdk-lib";
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
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
      DEBUG_MODE: config.debug || "",
      REGION: config.region || "",
      PRODUCTS_TABLE_NAME: config.productsTableName,
      STOCKS_TABLE_NAME: config.stocksTableName,
    };

    // Create Lambda functions
    const getProductsList = new nodejs.NodejsFunction(this, "GetProductsList", {
      runtime: lambda.Runtime.NODEJS_18_X,
      functionName: "GetProductsList",
      entry: path.join(__dirname, "../handlers/getProductsList.ts"),
      handler: "getProductsListLambdaHandler",
      environment,
    });

    const getProductsById = new nodejs.NodejsFunction(this, "GetProductsById", {
      runtime: lambda.Runtime.NODEJS_18_X,
      functionName: "GetProductsById",
      entry: path.join(__dirname, "../handlers/getProductsById.ts"),
      handler: "getProductsByIdLambdaHandler",
      environment,
    });

    const createProduct = new nodejs.NodejsFunction(this, "CreateProduct", {
      runtime: lambda.Runtime.NODEJS_18_X,
      functionName: "CreateProduct",
      entry: path.join(__dirname, "../handlers/createProduct.ts"),
      handler: "createProductLambdaHandler",
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

    products.addMethod(
      "POST",
      new apigateway.LambdaIntegration(createProduct)
    );

    // Create /products/{productId} endpoint
    const product = products.addResource("{productId}");
    product.addMethod("GET", new apigateway.LambdaIntegration(getProductsById));

    // Output the API URL
    new cdk.CfnOutput(this, "ApiUrl", {
      value: api.url,
      description: "API Gateway endpoint URL",
    });

    // Import existing DynamoDB tables
    const productsTable = dynamodb.Table.fromTableName(
      this,
      "ImportedProductsTable",
      "products"
    );

    const stocksTable = dynamodb.Table.fromTableName(
      this,
      "ImportedStocksTable",
      "stocks"
    );

    // Create the seeding Lambda function
    const seedFunction = new nodejs.NodejsFunction(this, "SeedTablesFunction", {
      entry: path.join(__dirname, "../handlers/seed/seed.ts"),
      handler: "seedTablesLambdaHandler",
      runtime: cdk.aws_lambda.Runtime.NODEJS_18_X,
      timeout: cdk.Duration.seconds(30),
      environment: {
        PRODUCTS_TABLE_NAME: productsTable.tableName,
        STOCKS_TABLE_NAME: stocksTable.tableName,
      },
      bundling: {
        externalModules: ["aws-sdk"],
      },
    });

    const productsTableArn = `arn:aws:dynamodb:${this.region}:${this.account}:table/products`;
    const stocksTableArn = `arn:aws:dynamodb:${this.region}:${this.account}:table/stocks`;

    seedFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "dynamodb:Scan",
          "dynamodb:PutItem",
          "dynamodb:BatchWriteItem",
        ],
        resources: [productsTableArn, stocksTableArn],
      })
    );

    // Grant permissions
    productsTable.grantWriteData(seedFunction);
    productsTable.grantWriteData(createProduct);
    productsTable.grantReadData(getProductsList);
    productsTable.grantReadData(getProductsById);

    stocksTable.grantWriteData(seedFunction);
    stocksTable.grantReadData(getProductsList);
    stocksTable.grantReadData(getProductsById);

    // Trigger seeding through Custom Resource
    new cdk.CustomResource(this, "SeedingCustomResource", {
      serviceToken: seedFunction.functionArn,
      properties: {
        timestamp: Date.now(), // Force update on each deployment
      },
    });
  }
}
