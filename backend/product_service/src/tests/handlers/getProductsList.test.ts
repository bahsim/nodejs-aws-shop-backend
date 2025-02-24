// tests/handlers/getProductsList.test.ts
import { APIGatewayProxyEvent } from 'aws-lambda';
import { getProductsListLambdaHandler } from '../../handlers/getProductsList';
import { products } from '../../mockData';
import { createAPIGatewayProxyEvent } from '../utils/eventGenerator';
import { v4 as uuidv4 } from "uuid";
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// jest.mock("@aws-sdk/lib-dynamodb");
// jest.mock("uuid", () => ({
//   v4: jest.fn(() => "12345"),
// }));
// jest.mock("../../config");
// jest.mock("../../cors");

const mockUuidv4 = uuidv4 as jest.MockedFunction<typeof uuidv4>;

describe('getProductsList Lambda handler', () => {
    let mockEvent: APIGatewayProxyEvent;

    beforeEach(() => {
        mockEvent = createAPIGatewayProxyEvent({
            origin: 'http://localhost:3000'
        });
    });

    it('should return all products with status 200', async () => {
        const response = await getProductsListLambdaHandler(mockEvent);

        expect(response.statusCode).toBe(200);
        expect(JSON.parse(response.body)).toEqual(products);
    });

    it('should include CORS headers in response', async () => {
        const response = await getProductsListLambdaHandler(mockEvent);

        expect(response.headers).toEqual(expect.objectContaining({
            'Access-Control-Allow-Origin': 'http://localhost:3000',
            'Access-Control-Allow-Credentials': true
        }));
    });

    it('should handle requests from unknown origins', async () => {
        const mockEventUnknownOrigin = createAPIGatewayProxyEvent({
            origin: 'http://unknown-origin.com'
        });

        const response = await getProductsListLambdaHandler(mockEventUnknownOrigin);

        expect(response.headers?.['Access-Control-Allow-Origin']).toBe('https://dsja4dcomgujy.cloudfront.net');
    });

    it('should return valid JSON in response body', async () => {
        const response = await getProductsListLambdaHandler(mockEvent);
        
        expect(() => JSON.parse(response.body)).not.toThrow();
        const parsedBody = JSON.parse(response.body);
        expect(Array.isArray(parsedBody)).toBe(true);
    });
});
