import { APIGatewayProxyEvent } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import { Configuration } from '../../../../shared/src/config';
import { createProduct } from '../../handlers/createProduct';
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock UUID generation
jest.mock('uuid');

// Mock DynamoDB client
const mockSend = jest.fn().mockResolvedValue({} as never);
jest.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: jest.fn().mockReturnValue({
      send: (...args: any[]) => mockSend(...args)
    })
  },
  TransactWriteCommand: jest.fn().mockImplementation((params) => params)
}));

// Mock Configuration
jest.mock('../../config');

// Mock CORS headers
const mockHeaders = {
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Origin": "http://localhost:3000",
};

describe("createProduct Lambda Handler", () => {
  let consoleSpy: any;
  
  const mockConfig = {
    productsTableName: "ProductsTable",
    stocksTableName: "StocksTable",
    frontendUrl: "*"
  };

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    (Configuration.getConfig as jest.Mock).mockReturnValue(mockConfig);
    mockSend.mockClear();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    jest.clearAllMocks();
  });

  it("should create product and stock in a transaction", async () => {
    const productData = {
      title: "Test Product",
      description: "Test Description",
      price: 100,
      count: 5
    };

    const event = {
      body: JSON.stringify(productData)
    } as APIGatewayProxyEvent;

    const mockProductId = "mock-uuid";
    (uuidv4 as jest.Mock).mockReturnValue(mockProductId);

    const response = await createProduct(event);

    // Verify transaction was called with correct items
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        TransactItems: [
          {
            Put: {
              TableName: mockConfig.productsTableName,
              Item: {
                id: mockProductId,
                title: productData.title,
                description: productData.description,
                price: productData.price
              },
              ConditionExpression: "attribute_not_exists(id)"
            }
          },
          {
            Put: {
              TableName: mockConfig.stocksTableName,
              Item: {
                product_id: mockProductId,
                count: productData.count
              },
              ConditionExpression: "attribute_not_exists(product_id)"
            }
          }
        ]
      })
    );

    // Verify response
    expect(response.statusCode).toBe(201);
    expect(response.headers).toEqual(mockHeaders);
    expect(JSON.parse(response.body)).toEqual({
      id: mockProductId,
      title: productData.title,
      description: productData.description,
      price: productData.price,
      count: productData.count
    });
  });

  it("should handle transaction conflicts", async () => {
    const productData = {
      title: "Test Product",
      description: "Test Description",
      price: 100,
      count: 5
    };

    const event = {
      body: JSON.stringify(productData)
    } as APIGatewayProxyEvent;

    // Mock transaction conflict
    const transactionError = new Error('Transaction cancelled');
    Object.defineProperty(transactionError, 'name', { value: 'TransactionCanceledException' });
    // @ts-ignore
    mockSend.mockRejectedValueOnce(transactionError);

    const response = await createProduct(event);

    expect(response.statusCode).toBe(409);
    expect(response.headers).toEqual(mockHeaders);
    expect(JSON.parse(response.body)).toEqual({
      message: "Product creation failed due to conflict"
    });
  });

  it("should validate count is non-negative integer", async () => {
    const invalidCounts = [-1, 1.5, "5"];
    
    for (const invalidCount of invalidCounts) {
      const productData = {
        title: "Test Product",
        description: "Test Description",
        price: 100,
        count: invalidCount
      };

      const event = {
        body: JSON.stringify(productData)
      } as APIGatewayProxyEvent;

      const response = await createProduct(event);

      expect(response.statusCode).toBe(400);
      expect(response.headers).toEqual(mockHeaders);
      expect(JSON.parse(response.body)).toEqual({
        message: "Count must be a non-negative integer"
      });
    }
  });

  it("should return 400 if body is missing", async () => {
    const event = {} as APIGatewayProxyEvent;
    
    const response = await createProduct(event);

    expect(response.statusCode).toBe(400);
    expect(response.headers).toEqual(mockHeaders);
    expect(JSON.parse(response.body)).toEqual({
      message: "Product data is required"
    });
  });

  it("should return 400 if required fields are missing", async () => {
    const invalidCases = [
      { description: "Description", price: 100, count: 5 },           // missing title
      { title: "Title", price: 100, count: 5 },                      // missing description
      { title: "Title", description: "Description", count: 5 },       // missing price
      { title: "Title", description: "Description", price: 100 },     // missing count
      {}                                                              // missing all fields
    ];

    for (const invalidData of invalidCases) {
      const event = {
        body: JSON.stringify(invalidData)
      } as APIGatewayProxyEvent;

      const response = await createProduct(event);

      expect(response.statusCode).toBe(400);
      expect(response.headers).toEqual(mockHeaders);
      expect(JSON.parse(response.body)).toEqual({
        message: "Title, description, price, and count are required"
      });
    }
  });

  it("should return 400 if price is not a positive number", async () => {
    const invalidPrices = [-100, 0, "100", null];

    for (const invalidPrice of invalidPrices) {
      const productData = {
        title: "Test Product",
        description: "Test Description",
        price: invalidPrice,
        count: 5
      };

      const event = {
        body: JSON.stringify(productData)
      } as APIGatewayProxyEvent;

      const response = await createProduct(event);

      expect(response.statusCode).toBe(400);
      expect(response.headers).toEqual(mockHeaders);
      expect(JSON.parse(response.body)).toEqual({
        message: "Price must be a positive number"
      });
    }
  });

  it("should return 500 on unexpected errors", async () => {
    const productData = {
      title: "Test Product",
      description: "Test Description",
      price: 100,
      count: 5
    };

    const event = {
      body: JSON.stringify(productData)
    } as APIGatewayProxyEvent;

    // Mock unexpected error
    // @ts-ignore
    mockSend.mockRejectedValueOnce(new Error("Unexpected error"));

    const response = await createProduct(event);

    expect(response.statusCode).toBe(500);
    expect(response.headers).toEqual(mockHeaders);
    expect(JSON.parse(response.body)).toEqual({
      message: "Internal server error while creating product"
    });
  });
});
