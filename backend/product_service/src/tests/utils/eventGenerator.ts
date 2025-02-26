// tests/utils/eventGenerator.ts
import {
    APIGatewayProxyEvent,
    APIGatewayEventDefaultAuthorizerContext,
} from "aws-lambda";

export namespace APIGatewayProxyEventGenerator {
    export const getProductsList = (options: {
        pathParameters?: { [name: string]: string } | null;
        origin?: string;
    }): APIGatewayProxyEvent => {
        return {
            body: null,
            headers: {
                origin: options.origin || "http://localhost:3000",
            },
            multiValueHeaders: {},
            httpMethod: "GET",
            isBase64Encoded: false,
            path: "/products",
            pathParameters: options.pathParameters || null,
            queryStringParameters: null,
            multiValueQueryStringParameters: null,
            stageVariables: null,
            requestContext: {
                accountId: "123456789012",
                apiId: "test-api",
                authorizer: {} as APIGatewayEventDefaultAuthorizerContext,
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
                path: "/products",
                stage: "test",
                requestId: "test-id",
                requestTimeEpoch: 1628871225,
                resourceId: "test-resource",
                resourcePath: "/products",
            },
            resource: "/products",
        } as APIGatewayProxyEvent;
    };

    export const getProductsById = (options: {
        pathParameters?: { [name: string]: string } | null;
        origin?: string;
        path?: string;
        resourcePath?: string;
    }): APIGatewayProxyEvent => {
        const pathParams = options.pathParameters || null;
        const productId = pathParams?.productId || "";

        return {
            pathParameters: pathParams,
            headers: { origin: options.origin || "http://localhost:3000" },
            multiValueHeaders: {},
            httpMethod: "GET",
            path: options.path || `/products/${productId}`,
            queryStringParameters: null,
            multiValueQueryStringParameters: null,
            body: null,
            isBase64Encoded: false,
            stageVariables: null,
            requestContext: {
                accountId: "",
                apiId: "",
                authorizer: {} as APIGatewayEventDefaultAuthorizerContext,
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
                    sourceIp: "",
                    user: null,
                    userAgent: null,
                    userArn: null,
                },
                path: options.path || `/products/${productId}`,
                stage: "test",
                requestId: "test-id",
                requestTimeEpoch: 1234567890,
                resourceId: "test",
                resourcePath: options.resourcePath || "/products/{productId}",
            },
            resource: options.resourcePath || `/products/{productId}`
        };
    };
}
