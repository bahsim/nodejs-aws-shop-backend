// tests/handlers/getProductsList.test.ts
import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from '../../handlers/getProductsList';
import { products } from '../../mockData';
import { createAPIGatewayProxyEvent } from '../utils/eventGenerator';

describe('getProductsList Lambda handler', () => {
    let mockEvent: APIGatewayProxyEvent;

    beforeEach(() => {
        mockEvent = createAPIGatewayProxyEvent({
            origin: 'http://localhost:3000'
        });
    });

    it('should return all products with status 200', async () => {
        const response = await handler(mockEvent);

        expect(response.statusCode).toBe(200);
        expect(JSON.parse(response.body)).toEqual(products);
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
            origin: 'http://unknown-origin.com'
        });

        const response = await handler(mockEventUnknownOrigin);

        expect(response.headers?.['Access-Control-Allow-Origin']).toBe('https://dsja4dcomgujy.cloudfront.net');
    });

    it('should return valid JSON in response body', async () => {
        const response = await handler(mockEvent);
        
        expect(() => JSON.parse(response.body)).not.toThrow();
        const parsedBody = JSON.parse(response.body);
        expect(Array.isArray(parsedBody)).toBe(true);
    });
});
