// tests/handlers/getProductsById.test.ts
import { APIGatewayProxyEvent } from "aws-lambda";
import { getProductsByIdLambdaHandler } from "../../handlers/getProductsById";
import { products } from "../../mockData";
import { createAPIGatewayProxyEvent } from "../utils/eventGenerator";
import { v4 as uuidv4 } from "uuid";
import { describe, it, expect, beforeEach, jest } from "@jest/globals";

jest.mock("@aws-sdk/lib-dynamodb");
jest.mock("uuid", () => ({
  v4: jest.fn(() => "12345"),
}));

const mockUuidv4 = uuidv4 as jest.MockedFunction<typeof uuidv4>;

describe("getProductsById Lambda handler", () => {
  let mockEvent: APIGatewayProxyEvent;
  const validProductId = products[0].id;

  beforeEach(() => {
    mockEvent = createAPIGatewayProxyEvent({
      pathParameters: { productId: validProductId },
      origin: "http://localhost:3000",
    });
  });

  it("should return a product when valid ID is provided", async () => {
    mockUuidv4.mockReturnValue(validProductId as unknown as Uint8Array);
    const response = await getProductsByIdLambdaHandler(mockEvent);

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual(products[0]);
  });

  it("should return 404 when product is not found", async () => {
    const mockEventNotFound = createAPIGatewayProxyEvent({
      pathParameters: { productId: "non-existent-id" },
      origin: "http://localhost:3000",
    });

    const response = await getProductsByIdLambdaHandler(mockEventNotFound);

    expect(response.statusCode).toBe(404);
    expect(JSON.parse(response.body)).toEqual({
      message: "Product not found",
    });
  });

  it("should return 400 when productId is missing", async () => {
    const mockEventNoId = createAPIGatewayProxyEvent({
      pathParameters: null,
      origin: "http://localhost:3000",
    });

    const response = await getProductsByIdLambdaHandler(mockEventNoId);

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body)).toEqual({
      message: "Product ID is required",
    });
  });

  it("should include CORS headers in response", async () => {
    const response = await getProductsByIdLambdaHandler(mockEvent);

    expect(response.headers).toEqual(
      expect.objectContaining({
        "Access-Control-Allow-Origin": "http://localhost:3000",
        "Access-Control-Allow-Credentials": true,
      })
    );
  });

  it("should handle requests from unknown origins", async () => {
    const mockEventUnknownOrigin = createAPIGatewayProxyEvent({
      pathParameters: { productId: validProductId },
      origin: "http://unknown-origin.com",
    });

    const response = await getProductsByIdLambdaHandler(mockEventUnknownOrigin);

    expect(response.headers?.["Access-Control-Allow-Origin"]).toBe(
      "https://dsja4dcomgujy.cloudfront.net"
    );
  });

  it("should return valid JSON in response body", async () => {
    const response = await getProductsByIdLambdaHandler(mockEvent);

    expect(() => JSON.parse(response.body)).not.toThrow();
  });
});
