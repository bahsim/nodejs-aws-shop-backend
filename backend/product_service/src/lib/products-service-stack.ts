// product-service-stack.ts
import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as nodejs from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import * as path from "path";
import { Configuration } from "../../../shared/src/config";

const config = Configuration.getConfig();

const environment = {
  FRONTEND_URL: config.frontendUrl || "",
  DEBUG_MODE: config.debug || "",
  REGION: config.region || "",
  PRODUCTS_TABLE_NAME: config.productsTableName,
  STOCKS_TABLE_NAME: config.stocksTableName,
};

export class ProductServiceStack extends cdk.Stack {
  private readonly productsTable: cdk.aws_dynamodb.ITable;
  private readonly stocksTable: cdk.aws_dynamodb.ITable;
  private readonly getProductsList: cdk.aws_lambda_nodejs.NodejsFunction;
  private readonly getProductsById: cdk.aws_lambda_nodejs.NodejsFunction;
  private readonly createProduct: cdk.aws_lambda_nodejs.NodejsFunction;
  private readonly seedTables: cdk.aws_lambda_nodejs.NodejsFunction;
  private readonly restApi: cdk.aws_apigateway.RestApi;
  private readonly productsResource: cdk.aws_apigateway.Resource;
  private readonly productItemResource: cdk.aws_apigateway.Resource;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.productsTable = dynamodb.Table.fromTableName(
      this,
      "ImportedProductsTable",
      "products"
    );

    this.stocksTable = dynamodb.Table.fromTableName(
      this,
      "ImportedStocksTable",
      "stocks"
    );

    this.getProductsList = this.createGetProductsListFunction();
    this.getProductsById = this.createGetProductsByIdFunction();
    this.createProduct = this.createCreateProductFunction();
    this.seedTables = this.createSeedTables();
    this.restApi = this.createRestApi();

    this.productsResource = this.restApi.root.addResource("products"); // /products endpoint
    this.productItemResource = this.productsResource.addResource("{productId}"); // /products/{productId} endpoint

    this.productsResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(this.getProductsList)
    );
    this.productsResource.addMethod(
      "POST",
      new apigateway.LambdaIntegration(this.createProduct)
    );

    this.productItemResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(this.getProductsById)
    );

    this.productsTable.grantWriteData(this.seedTables);
    this.productsTable.grantWriteData(this.createProduct);
    this.productsTable.grantReadData(this.getProductsList);
    this.productsTable.grantReadData(this.getProductsById);
    this.stocksTable.grantWriteData(this.seedTables);
    this.stocksTable.grantReadData(this.getProductsList);
    this.stocksTable.grantReadData(this.getProductsById);

    new cdk.CustomResource(this, "SeedingCustomResource", {
      serviceToken: this.seedTables.functionArn,
      properties: {
        timestamp: Date.now(), // Force update on each deployment
      },
    });

    new cdk.CfnOutput(this, "ApiUrl", {
      value: this.restApi.url,
      description: "API Gateway endpoint URL",
    });
  }

  private createGetProductsListFunction() {
    return new nodejs.NodejsFunction(this, "GetProductsList", {
      runtime: lambda.Runtime.NODEJS_18_X,
      functionName: "GetProductsList",
      entry: path.join(__dirname, "../handlers/getProductsList.ts"),
      handler: "getProductsList",
      environment,
    });
  }

  private createGetProductsByIdFunction() {
    return new nodejs.NodejsFunction(this, "GetProductsById", {
      runtime: lambda.Runtime.NODEJS_18_X,
      functionName: "GetProductsById",
      entry: path.join(__dirname, "../handlers/getProductsById.ts"),
      handler: "getProductsById",
      environment,
    });
  }

  private createCreateProductFunction() {
    return new nodejs.NodejsFunction(this, "CreateProduct", {
      runtime: lambda.Runtime.NODEJS_18_X,
      functionName: "CreateProduct",
      entry: path.join(__dirname, "../handlers/createProduct.ts"),
      handler: "createProduct",
      environment,
      initialPolicy: [
        new iam.PolicyStatement({
          actions: ["dynamodb:PutItem", "dynamodb:TransactWriteItems"],
          resources: [this.productsTable.tableArn, this.stocksTable.tableArn],
        }),
      ],
    });
  }

  private createSeedTables() {
    return new nodejs.NodejsFunction(this, "SeedTablesFunction", {
      entry: path.join(__dirname, "../handlers/seedTables.ts"),
      handler: "seedTables",
      runtime: cdk.aws_lambda.Runtime.NODEJS_18_X,
      timeout: cdk.Duration.seconds(30),
      environment: {
        PRODUCTS_TABLE_NAME: this.productsTable.tableName,
        STOCKS_TABLE_NAME: this.stocksTable.tableName,
      },
      bundling: {
        externalModules: ["aws-sdk"],
      },
      initialPolicy: [
        new iam.PolicyStatement({
          actions: ["dynamodb:Scan", "dynamodb:BatchWriteItem"],
          resources: [this.productsTable.tableArn, this.stocksTable.tableArn],
        }),
      ],
    });
  }

  private createRestApi() {
    return new apigateway.RestApi(this, "ProductsApi", {
      restApiName: "Products Service",
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
  }
}
