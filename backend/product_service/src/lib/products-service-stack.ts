import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as nodejs from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import * as path from "path";
import { Configuration } from "../../../shared/src/config";
import { EnvironmentRequiredVariables } from "../constants";

interface LambdaConfig {
  runtime: lambda.Runtime;
  memorySize: number;
  timeout: cdk.Duration;
  environment: { [key: string]: string };
}

const config = Configuration.getConfig(EnvironmentRequiredVariables);

export class ProductServiceStack extends cdk.Stack {
  private readonly productsTable: cdk.aws_dynamodb.ITable;
  private readonly stocksTable: cdk.aws_dynamodb.ITable;
  private readonly restApi: cdk.aws_apigateway.RestApi;

  // Common Lambda configuration
  private readonly defaultLambdaConfig: LambdaConfig = {
    runtime: lambda.Runtime.NODEJS_18_X,
    memorySize: 256,
    timeout: cdk.Duration.seconds(10),
    environment: {
      FRONTEND_URL: config.frontendUrl || "",
      DEBUG_MODE: config.debug || "",
      REGION: config.region || "",
      PRODUCTS_TABLE_NAME: config.productsTableName,
      STOCKS_TABLE_NAME: config.stocksTableName,
    },
  };

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Initialize DynamoDB tables with error handling
    try {
      this.productsTable = this.importDynamoDBTable("products");
      this.stocksTable = this.importDynamoDBTable("stocks");
    } catch (error) {
      throw new Error(`Failed to import DynamoDB tables: ${error}`);
    }

    // Create API Gateway
    this.restApi = this.createRestApi();

    // Create and configure Lambda functions
    const lambdas = this.createLambdaFunctions();

    // Configure API routes
    this.configureApiRoutes(lambdas);

    // Grant DynamoDB permissions
    this.grantDynamoDBPermissions(lambdas);

    // Create seeding custom resource
    this.createSeedingResource(lambdas.seedTables);

    // Output API URL
    new cdk.CfnOutput(this, "ApiUrl", {
      value: this.restApi.url,
      description: "API Gateway endpoint URL",
    });
  }

  private importDynamoDBTable(tableName: string): dynamodb.ITable {
    return dynamodb.Table.fromTableName(
      this,
      `Imported${tableName}Table`,
      tableName
    );
  }

  private createLambdaFunctions() {
    return {
      getProductsList: this.createLambdaFunction(
        "GetProductsList",
        "getProductsList"
      ),
      getProductsById: this.createLambdaFunction(
        "GetProductsById",
        "getProductsById"
      ),
      createProduct: this.createLambdaFunction(
        "CreateProduct",
        "createProduct",
        {
          timeout: cdk.Duration.seconds(15),
          initialPolicy: [
            new iam.PolicyStatement({
              actions: ["dynamodb:PutItem", "dynamodb:TransactWriteItems"],
              resources: [
                this.productsTable.tableArn,
                this.stocksTable.tableArn,
              ],
            }),
          ],
        }
      ),
      seedTables: this.createLambdaFunction("SeedTables", "seedTables", {
        timeout: cdk.Duration.seconds(30),
        initialPolicy: [
          new iam.PolicyStatement({
            actions: ["dynamodb:Scan", "dynamodb:BatchWriteItem"],
            resources: [this.productsTable.tableArn, this.stocksTable.tableArn],
          }),
        ],
      }),
    };
  }

  private createLambdaFunction(
    name: string,
    handler: string,
    overrides: Partial<nodejs.NodejsFunctionProps> = {}
  ): nodejs.NodejsFunction {
    return new nodejs.NodejsFunction(this, name, {
      functionName: name,
      entry: path.join(__dirname, `../handlers/${handler}.ts`),
      handler,
      ...this.defaultLambdaConfig,
      ...overrides,
    });
  }

  private createRestApi(): apigateway.RestApi {
    return new apigateway.RestApi(this, "ProductsApi", {
      restApiName: "Products Service",
      defaultCorsPreflightOptions: {
        allowOrigins: ["http://localhost:3000", config.frontendUrl],
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          "Content-Type",
          "X-Amz-Date",
          "Authorization",
          "X-Api-Key",
          "X-Amz-Security-Token",
        ],
        allowCredentials: true,
        maxAge: cdk.Duration.days(1),
      },
      deployOptions: {
        stageName: "prod",
        metricsEnabled: true,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
      },
    });
  }

  private configureApiRoutes(lambdas: Record<string, nodejs.NodejsFunction>) {
    const productsResource = this.restApi.root.addResource("products");
    const productItemResource = productsResource.addResource("{productId}");

    // Configure methods with proper response models
    const integration = {
      getProductsList: new apigateway.LambdaIntegration(
        lambdas.getProductsList,
        {
          proxy: true,
        }
      ),
      getProductsById: new apigateway.LambdaIntegration(
        lambdas.getProductsById,
        {
          proxy: true,
        }
      ),
      createProduct: new apigateway.LambdaIntegration(lambdas.createProduct, {
        proxy: true,
      }),
    };

    productsResource.addMethod("GET", integration.getProductsList);
    productsResource.addMethod("POST", integration.createProduct);
    productItemResource.addMethod("GET", integration.getProductsById);
  }

  private grantDynamoDBPermissions(
    lambdas: Record<string, nodejs.NodejsFunction>
  ) {
    // Read permissions
    [lambdas.getProductsList, lambdas.getProductsById].forEach((lambda) => {
      this.productsTable.grantReadData(lambda);
      this.stocksTable.grantReadData(lambda);
    });

    // Write permissions
    this.productsTable.grantWriteData(lambdas.createProduct);
    this.productsTable.grantWriteData(lambdas.seedTables);
    this.stocksTable.grantWriteData(lambdas.seedTables);
  }

  private createSeedingResource(seedFunction: nodejs.NodejsFunction) {
    return new cdk.CustomResource(this, "SeedingCustomResourceV2", {
      serviceToken: seedFunction.functionArn,
      properties: {
        timestamp: Date.now(),
      },
    });
  }
}
