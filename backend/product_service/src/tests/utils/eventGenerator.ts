// tests/utils/eventGenerator.ts
import { APIGatewayProxyEvent, APIGatewayEventDefaultAuthorizerContext, APIGatewayProxyEventBase } from 'aws-lambda';

export const createAPIGatewayProxyEvent = (options: {
    pathParameters?: { [name: string]: string } | null;
    origin?: string;
}): APIGatewayProxyEvent => {
    return {
        body: null,
        headers: {
            origin: options.origin || 'http://localhost:3000'
        },
        multiValueHeaders: {},
        httpMethod: 'GET',
        isBase64Encoded: false,
        path: '/products',
        pathParameters: options.pathParameters || null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {
            accountId: '123456789012',
            apiId: 'test-api',
            authorizer: {},
            protocol: 'HTTP/1.1',
            httpMethod: 'GET',
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
                sourceIp: '127.0.0.1',
                user: null,
                userAgent: null,
                userArn: null
            },
            path: '/products',
            stage: 'test',
            requestId: 'test-id',
            requestTimeEpoch: 1628871225,
            resourceId: 'test-resource',
            resourcePath: '/products'
        },
        resource: '/products'
    } as APIGatewayProxyEvent;
};
