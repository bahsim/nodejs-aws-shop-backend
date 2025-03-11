// authorization-service/lib/authorization-service-stack.ts
import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { config as dotenvConfig } from "dotenv";
import { join } from "path";
import { LAMBDA_FUNCTIONS, GITHUB_USER_NAME } from "../../shared/src/constants";

dotenvConfig();

/**
 * Represents the stack for the Authorization Service.
 * This stack includes a Lambda function for basic authorization.
 */
export class AuthorizationServiceStack extends cdk.Stack {
  /**
   * The Lambda function used for basic authorization.
   */
  public readonly basicAuthorizerFunction: lambda.Function;

  /**
   * Initializes a new instance of the AuthorizationServiceStack class.
   * 
   * @param scope - The scope in which this stack is defined.
   * @param id - The scoped ID of the stack.
   * @param props - Stack properties.
   */
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.basicAuthorizerFunction = this.createLambdaFunction(
      LAMBDA_FUNCTIONS.authorizationService.basicAuthorizer.name,
      LAMBDA_FUNCTIONS.authorizationService.basicAuthorizer.handler
    );
  }

  /**
   * Creates a Lambda function with the specified name and handler.
   * 
   * @param name - The name of the Lambda function.
   * @param handler - The handler for the Lambda function.
   * @returns The created Lambda function.
   */
  private createLambdaFunction(name: string, handler: string): lambda.Function {
    return new NodejsFunction(this, name, {
      functionName: name,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: handler,
      entry: join(__dirname, `../handlers/${handler}.ts`),
      environment: {
        [GITHUB_USER_NAME]: process.env[GITHUB_USER_NAME] || "",
      },
    });
  }
}
