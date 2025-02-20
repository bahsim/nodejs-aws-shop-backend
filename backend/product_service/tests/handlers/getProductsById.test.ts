// tests/handlers/getProductsById.test.ts
import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from '../../handlers/getProductsById';
import { products } from '../../mockData';
import { createAPIGatewayProxyEvent } from '../utils/eventGenerator';

describe('getProductsById Lambda handler', () => {
    let mockEvent: APIGatewayProxyEvent;
    const validProductId = products[0].id;

    beforeEach(() => {
        mockEvent = createAPIGatewayProxyEvent({
            pathParameters: { productId: validProductId },
            origin: 'http://localhost:3000'
        });
    });

    it('should return a product when valid ID is provided', async () => {
        const response = await handler(mockEvent);

        expect(response.statusCode).toBe(200);
        expect(JSON.parse(response.body)).toEqual(products[0]);
    });

    it('should return 404 when product is not found', async () => {
        const mockEventNotFound = createAPIGatewayProxyEvent({
            pathParameters: { productId: 'non-existent-id' },
            origin: 'http://localhost:3000'
        });
        
        const response = await handler(mockEventNotFound);

        expect(response.statusCode).toBe(404);
        expect(JSON.parse(response.body)).toEqual({
            message: 'Product not found'
        });
    });

    it('should return 400 when productId is missing', async () => {
        const mockEventNoId = createAPIGatewayProxyEvent({
            pathParameters: null,
            origin: 'http://localhost:3000'
        });
        
        const response = await handler(mockEventNoId);

        expect(response.statusCode).toBe(400);
        expect(JSON.parse(response.body)).toEqual({
            message: 'Product ID is required'
        });
    });

    it('should include CORS headers in response', async () => {
        const response = await handler(mockEvent);

        expect(response.headers).toEqual(expect.objectContaining({
            'Access-Control-Allow-Origin': 'http://localhost:3000',
            'Access-Control-Allow-Credentials': true
        }));
    });

    it('should handle requests from unknown origins', async () => {
        const mockEventUnknownOrigin = createAPIGatewayProxyEvent({
            pathParameters: { productId: validProductId },
            origin: 'http://unknown-origin.com'
        });

        const response = await handler(mockEventUnknownOrigin);

        expect(response.headers?.['Access-Control-Allow-Origin']).toBe('https://dsja4dcomgujy.cloudfront.net');
    });

    it('should return valid JSON in response body', async () => {
        const response = await handler(mockEvent);
        
        expect(() => JSON.parse(response.body)).not.toThrow();
    });
});
