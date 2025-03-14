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
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as sns from "aws-cdk-lib/aws-sns";
import * as snsSubs from "aws-cdk-lib/aws-sns-subscriptions";
import * as lambdaEventSources from "aws-cdk-lib/aws-lambda-event-sources";

interface LambdaConfig {
  runtime: lambda.Runtime;
  memorySize: number;
  timeout: cdk.Duration;
  environment: { [key: string]: string };
}

const config = Configuration.getConfig(EnvironmentRequiredVariables);

/**
 * Represents the stack for the Product Service in AWS CDK.
 * This stack includes the following resources:
 * - DynamoDB tables for products and stocks
 * - API Gateway for RESTful API endpoints
 * - SNS Topic for product creation notifications
 * - SQS Queue for catalog item processing
 * - Lambda functions for various operations
 *
 * The stack also configures API routes, grants necessary permissions,
 * and sets up subscriptions and custom resources.
 *
 * @class ProductServiceStack
 * @extends {cdk.Stack}
 *
 * @property {cdk.aws_dynamodb.ITable} productsTable - The DynamoDB table for products.
 * @property {cdk.aws_dynamodb.ITable} stocksTable - The DynamoDB table for stocks.
 * @property {cdk.aws_apigateway.RestApi} restApi - The API Gateway for the product service.
 * @property {cdk.aws_sns.Topic} createProductTopic - The SNS Topic for product creation notifications.
 * @property {cdk.aws_sqs.Queue} catalogItemsQueue - The SQS Queue for catalog item processing.
 * @property {Object} lambdas - The Lambda functions used in the stack.
 * @property {cdk.aws_lambda_nodejs.NodejsFunction} lambdas.getProductsList - Lambda function to get the list of products.
 * @property {cdk.aws_lambda_nodejs.NodejsFunction} lambdas.getProductsById - Lambda function to get a product by ID.
 * @property {cdk.aws_lambda_nodejs.NodejsFunction} lambdas.createProduct - Lambda function to create a new product.
 * @property {cdk.aws_lambda_nodejs.NodejsFunction} lambdas.seedTables - Lambda function to seed the DynamoDB tables.
 * @property {cdk.aws_lambda.Function} lambdas.catalogBatchProcess - Lambda function to process catalog items in batches.
 *
 * @constructor
 * @param {Construct} scope - The scope in which this stack is defined.
 * @param {string} id - The scoped construct ID.
 * @param {cdk.StackProps} [props] - Stack properties.
 */
export class ProductServiceStack extends cdk.Stack {
  private readonly productsTable: cdk.aws_dynamodb.ITable;
  private readonly stocksTable: cdk.aws_dynamodb.ITable;
  private readonly restApi: cdk.aws_apigateway.RestApi;
  private readonly createProductTopic: cdk.aws_sns.Topic;
  private readonly catalogItemsQueue: cdk.aws_sqs.Queue;
  private readonly lambdas: {
    getProductsList: cdk.aws_lambda_nodejs.NodejsFunction;
    getProductsById: cdk.aws_lambda_nodejs.NodejsFunction;
    createProduct: cdk.aws_lambda_nodejs.NodejsFunction;
    seedTables: cdk.aws_lambda_nodejs.NodejsFunction;
    catalogBatchProcess: cdk.aws_lambda.Function;
  };

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
      this.productsTable = this.importDynamoDBTable(config.productsTableName);
      this.stocksTable = this.importDynamoDBTable(config.stocksTableName);
    } catch (error) {
      throw new Error(`Failed to import DynamoDB tables: ${error}`);
    }

    // Create API Gateway
    this.restApi = this.createRestApi();

    // Create SNS Topic
    this.createProductTopic = this.createCreateProductTopic();

    // Create and configure Lambda functions
    this.lambdas = this.createLambdaFunctions();

    // Configure API routes
    this.configureApiRoutes();

    // Grant DynamoDB permissions
    this.grantDynamoDBPermissions();

    // Create seeding custom resource
    this.createSeedingResource();

    // Create SQS Queue
    this.catalogItemsQueue = this.createCatalogItemsQueue();

    // Initialize subscriptions
    this.initializeSubscriptions();

    // Output API URL
    new cdk.CfnOutput(this, "ApiUrl", {
      value: this.restApi.url,
      description: "API Gateway endpoint URL",
    });

    new cdk.CfnOutput(this, "CatalogItemsQueueUrl", {
      value: this.catalogItemsQueue.queueUrl,
      exportName: "CatalogItemsQueueUrl",
    });

    new cdk.CfnOutput(this, "CatalogItemsQueueArn", {
      value: this.catalogItemsQueue.queueArn,
      exportName: "CatalogItemsQueueArn",
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
      catalogBatchProcess: this.createLambdaFunction(
        "CatalogBatchProcess",
        "catalogBatchProcess",
        {
          environment: {
            SNS_TOPIC_ARN: this.createProductTopic.topicArn,
            PRODUCTS_TABLE_NAME: config.productsTableName,
            STOCKS_TABLE_NAME: config.stocksTableName,
          },
        }
      ),
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
      environment: {
        ...this.defaultLambdaConfig.environment,
        ...overrides.environment,
      },
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

  private configureApiRoutes() {
    const productsResource = this.restApi.root.addResource("products");
    const productItemResource = productsResource.addResource("{productId}");

    // Configure methods with proper response models
    const integration = {
      getProductsList: new apigateway.LambdaIntegration(
        this.lambdas.getProductsList,
        {
          proxy: true,
        }
      ),
      getProductsById: new apigateway.LambdaIntegration(
        this.lambdas.getProductsById,
        {
          proxy: true,
        }
      ),
      createProduct: new apigateway.LambdaIntegration(
        this.lambdas.createProduct,
        {
          proxy: true,
        }
      ),
    };

    productsResource.addMethod("GET", integration.getProductsList);
    productsResource.addMethod("POST", integration.createProduct);
    productItemResource.addMethod("GET", integration.getProductsById);
  }

  private createCreateProductTopic(): sns.Topic {
    return new sns.Topic(this, "CreateProductTopic", {
      topicName: "createProductTopic",
    });
  }

  private grantDynamoDBPermissions() {
    // Read permissions
    [this.lambdas.getProductsList, this.lambdas.getProductsById].forEach(
      (lambda) => {
        this.productsTable.grantReadData(lambda);
        this.stocksTable.grantReadData(lambda);
      }
    );

    // Write permissions
    this.productsTable.grantWriteData(this.lambdas.createProduct);
    this.productsTable.grantWriteData(this.lambdas.seedTables);
    this.productsTable.grantWriteData(this.lambdas.catalogBatchProcess);
    this.stocksTable.grantWriteData(this.lambdas.seedTables);
    this.stocksTable.grantWriteData(this.lambdas.catalogBatchProcess);
  }

  private createSeedingResource() {
    return new cdk.CustomResource(this, "SeedingCustomResourceV2", {
      serviceToken: this.lambdas.seedTables.functionArn,
      properties: {
        timestamp: Date.now(),
      },
    });
  }

  private createCatalogItemsQueue(): sqs.Queue {
    return new sqs.Queue(this, "CatalogItemsQueue", {
      queueName: "catalogItemsQueue",
      visibilityTimeout: cdk.Duration.seconds(30),
    });
  }

  private initializeSubscriptions(): void {
    // Add email subscription
    this.createProductTopic.addSubscription(
      new snsSubs.EmailSubscription(config.emailSubscription)
    );

    // Add filtered subscription for high-price products
    this.createProductTopic.addSubscription(
      new snsSubs.EmailSubscription(config.emailSubscription2, {
        filterPolicy: {
          price: sns.SubscriptionFilter.numericFilter({
            greaterThan: 100,
          }),
        },
      })
    );

    // Add filtered subscription for low-price products
    this.createProductTopic.addSubscription(
      new snsSubs.EmailSubscription(config.emailSubscription3, {
        filterPolicy: {
          price: sns.SubscriptionFilter.numericFilter({
            lessThanOrEqualTo: 100,
          }),
        },
      })
    );

    // Add SQS trigger to Lambda
    this.lambdas.catalogBatchProcess.addEventSource(
      new lambdaEventSources.SqsEventSource(this.catalogItemsQueue, {
        batchSize: 5,
      })
    );

    // Grant permissions
    this.catalogItemsQueue.grantConsumeMessages(
      this.lambdas.catalogBatchProcess
    );
    this.createProductTopic.grantPublish(this.lambdas.catalogBatchProcess);
  }
}
