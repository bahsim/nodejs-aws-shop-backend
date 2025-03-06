import { APIGatewayProxyEvent } from "aws-lambda";

/**
 * Namespace containing utility functions for generating mock API Gateway Proxy Events.
 */
export namespace APIGatewayProxyEventGenerator {
  /**
   * Generates a mock APIGatewayProxyEvent for the importProductsFile function.
   *
   * @param queryParams - An object containing query parameters as key-value pairs.
   * @returns A mock APIGatewayProxyEvent object with the provided query parameters.
   */
  export const importProductsFile = (queryParams: {
    [key: string]: string | undefined;
  }): APIGatewayProxyEvent => {
    return {
      body: null,
      headers: {},
      multiValueHeaders: {},
      httpMethod: "GET",
      isBase64Encoded: false,
      path: "/import",
      pathParameters: null,
      queryStringParameters: queryParams,
      multiValueQueryStringParameters: null,
      stageVariables: null,
      requestContext: {
        accountId: "123456789012",
        apiId: "api-id",
        authorizer: {},
        protocol: "HTTP/1.1",
        httpMethod: "GET",
        identity: {
          accessKey: null,
          accountId: null,
          apiKey: null,
          apiKeyId: null,
          caller: null,
          clientCert: null,
          cognitoAuthenticationProvider: null,
          cognitoAuthenticationType: null,
          cognitoIdentityId: null,
          cognitoIdentityPoolId: null,
          principalOrgId: null,
          sourceIp: "127.0.0.1",
          user: null,
          userAgent: null,
          userArn: null,
        },
        path: "/import",
        stage: "dev",
        requestId: "request-id",
        requestTimeEpoch: 1234567890,
        resourceId: "resource-id",
        resourcePath: "/import",
      },
      resource: "/import",
    };
  };
}
