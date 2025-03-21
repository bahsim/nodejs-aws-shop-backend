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
import { EnvironmentRequiredVariables } from "../constants";
import { LAMBDA_FUNCTIONS } from "../../../shared/src/constants";

interface LambdaConfig {
  runtime: lambda.Runtime;
  memorySize: number;
  timeout: cdk.Duration;
  environment: { [key: string]: string };
}

const config = Configuration.getConfig(EnvironmentRequiredVariables);

/**
 * The `ImportServiceStack` class defines an AWS CDK stack for the Import Service.
 * This stack sets up the necessary AWS resources including S3 bucket, Lambda functions,
 * API Gateway, and necessary permissions and configurations.
 *
 * @extends {cdk.Stack}
 */
export class ImportServiceStack extends cdk.Stack {
  private bucket: s3.IBucket;
  private lambdas: {
    importProductsFile: cdk.aws_lambda_nodejs.NodejsFunction;
    importFileParser: cdk.aws_lambda_nodejs.NodejsFunction;
  };
  private readonly restApi: cdk.aws_apigateway.RestApi;
  private readonly catalogItemsQueueUrl: string;
  private readonly catalogItemsQueueArn: string;
  private readonly authorizer: cdk.aws_apigateway.TokenAuthorizer;

  // Common Lambda configuration
  private readonly defaultLambdaConfig: LambdaConfig = {
    runtime: lambda.Runtime.NODEJS_18_X,
    memorySize: 256,
    timeout: cdk.Duration.seconds(10),
    environment: {
      BUCKET_NAME: config.bucketName,
      UPLOAD_FOLDER: config.uploadFolder,
      PARSED_FOLDER: config.parsedFolder,
      FRONTEND_URL: config.frontendUrl,
    },
  };

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create the authorizer
    this.authorizer = this.createAuthorizer();

    // Import the queue URL from Product Service stack
    this.catalogItemsQueueUrl = cdk.Fn.importValue("CatalogItemsQueueUrl");
    this.catalogItemsQueueArn = cdk.Fn.importValue("CatalogItemsQueueArn");

    // Initialize S3 bucket
    try {
      this.bucket = this.importBucket();
    } catch (error) {
      throw new Error(`Failed to import S3 bucket: ${error}`);
    }

    // Create and configure Lambda functions
    this.lambdas = this.createLambdaFunctions();

    // Grant S3 permissions
    this.grantBucketPermissions();

    // Grant Lambda permissions
    this.grantLambdasPermissions();

    // Configure S3 event notification
    this.configureS3EventNotification();

    // Create API Gateway
    this.restApi = this.createApiGateway();

    // Add gateway responses
    this.addGatewayResponses();

    // Create /import endpoint
    this.configureApiEndpoints();

    // Output the API URL
    new cdk.CfnOutput(this, "ApiUrl", {
      value: this.restApi.url,
      description: "API Gateway endpoint URL for Import Service",
    });
  }

  private createAuthorizer(): apigateway.TokenAuthorizer {
    // First, get the authorizer function ARN from the environment or constants
    const authorizerFunctionName =
      LAMBDA_FUNCTIONS.authorizationService.basicAuthorizer.name;

    // Import the existing Lambda function
    const authorizerFn = lambda.Function.fromFunctionName(
      this,
      "ImportAuthorizer",
      authorizerFunctionName
    );

    // Create the authorizer with proper configuration
    return new apigateway.TokenAuthorizer(this, "ImportApiAuthorizer", {
      handler: authorizerFn,
      identitySource: apigateway.IdentitySource.header("Authorization"),
      resultsCacheTtl: cdk.Duration.seconds(0), // Disable caching
      validationRegex: "^(?:Basic|Bearer) [-0-9a-zA-Z._~+/]+=*$", // Optional: validate token format
    });
  }

  private importBucket() {
    return s3.Bucket.fromBucketName(
      this,
      "ImportBucket",
      "bahsim-import-service"
    );
  }

  private createLambdaFunctions() {
    return {
      importProductsFile: this.createLambdaFunction(
        "ImportProductsFile",
        "importProductsFile"
      ),
      importFileParser: this.createLambdaFunction(
        "ImportFileParser",
        "importFileParser",
        {
          environment: {
            ...this.defaultLambdaConfig.environment,
            SQS_QUEUE_URL: this.catalogItemsQueueUrl,
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

  private grantBucketPermissions(): void {
    this.bucket.grantReadWrite(this.lambdas.importProductsFile);
    this.bucket.grantReadWrite(this.lambdas.importFileParser);
  }

  private grantLambdasPermissions(): void {
    this.lambdas.importFileParser.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["s3:PutObject", "s3:DeleteObject"],
        resources: [
          `${this.bucket.bucketArn}/${config.uploadFolder}/*`,
          `${this.bucket.bucketArn}/${config.parsedFolder}/*`,
        ],
      })
    );

    // Grant permissions to send messages to the queue
    this.lambdas.importFileParser.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["sqs:SendMessage", "sqs:GetQueueUrl"],
        resources: [this.catalogItemsQueueArn],
      })
    );
  }

  private configureS3EventNotification(): void {
    this.bucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(this.lambdas.importFileParser),
      { prefix: `${config.uploadFolder}/` }
    );
  }

  private createApiGateway(): apigateway.RestApi {
    return new apigateway.RestApi(this, "ImportApi", {
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
  }

  private addGatewayResponses(): void {
    this.addGatewayResponse(
      "Unauthorized",
      apigateway.ResponseType.UNAUTHORIZED,
      "401"
    );
    this.addGatewayResponse(
      "Forbidden",
      apigateway.ResponseType.ACCESS_DENIED,
      "403"
    );
  }

  private addGatewayResponse(
    name: string,
    type: apigateway.ResponseType,
    statusCode: string
  ): void {
    this.restApi.addGatewayResponse(name, {
      type: type,
      statusCode: statusCode,
      responseHeaders: {
        "Access-Control-Allow-Origin": "'*'",
        "Access-Control-Allow-Headers": "'Content-Type,Authorization'",
      },
      templates: {
        "application/json": JSON.stringify({
          message: "$context.authorizer.message",
          statusCode: "$context.authorizer.statusCode",
        }),
      },
    });
  }

  private configureApiEndpoints(): void {
    this.restApi.root
      .addResource("import")
      .addMethod(
        "GET",
        new apigateway.LambdaIntegration(this.lambdas.importProductsFile),
        {
          requestParameters: {
            "method.request.querystring.name": true,
          },
          authorizer: this.authorizer,
          authorizationType: apigateway.AuthorizationType.CUSTOM,
        }
      );
  }
}
