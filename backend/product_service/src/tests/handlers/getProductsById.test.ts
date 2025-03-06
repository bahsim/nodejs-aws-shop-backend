import { APIGatewayProxyEvent } from "aws-lambda";
import { getProductsById } from "../../handlers/getProductsById";
import { products, stocks } from "../mockData";
import { APIGatewayProxyEventGenerator } from "../utils/eventGenerator";
import { v4 as uuidv4 } from "uuid";
import { describe, it, beforeEach, expect, jest } from "@jest/globals";
import { ALLOWED_ORIGINS } from "../../../../shared/src/constants";
import { getCorsHeaders } from "../../../../shared/src/cors";

jest.mock("@aws-sdk/lib-dynamodb", () => ({
  DynamoDBDocumentClient: {
    from: jest.fn(() => ({
      send: jest
        .fn()
        .mockImplementationOnce(() =>
          Promise.resolve({
            Item: products[0],
          })
        )
        .mockImplementationOnce(() =>
          Promise.resolve({
            Item: stocks[0],
          })
        )
        .mockImplementationOnce(() =>
          Promise.resolve(null)
        )
    })),
  },
  GetCommand: jest.fn().mockImplementation((params) => params),
}));

jest.mock("uuid", () => ({
  v4: jest.fn(() => "12345"),
}));

const mockUuidv4 = uuidv4 as jest.MockedFunction<typeof uuidv4>;

describe("getProductsById Lambda handler", () => {
  let mockEvent: APIGatewayProxyEvent;
  const validProductId = products[0].id;

  beforeEach(() => {
    mockEvent = APIGatewayProxyEventGenerator.getProductsById({
      pathParameters: { productId: validProductId },
      origin: "http://localhost:3000",
      path: `/products/${validProductId}`,
      resourcePath: "/products/{productId}",
    });
  });

  it("should return a product when valid ID is provided", async () => {
    mockUuidv4.mockReturnValue(validProductId as unknown as Uint8Array);
    const response = await getProductsById(mockEvent);

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual(products[0]);
  });

  it("should return 404 when product is not found", async () => {
    const mockEventNotFound = APIGatewayProxyEventGenerator.getProductsById({
      pathParameters: { productId: "non-existent-id" },
      origin: "http://localhost:3000",
      path: `/products/${validProductId}`,
      resourcePath: "/products/{productId}",
    });

    const response = await getProductsById(mockEventNotFound);

    expect(response.statusCode).toBe(404);
    expect(JSON.parse(response.body)).toEqual({
      message: "Product not found",
    });
  });

  it("should return 400 when productId is missing", async () => {
    const mockEventNoId = APIGatewayProxyEventGenerator.getProductsById({
      pathParameters: null,
      origin: "http://localhost:3000",
    });

    const response = await getProductsById(mockEventNoId);

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body)).toEqual({
      message: "Product ID is required",
    });
  });

  it("should include CORS headers in response", async () => {
    const response = await getProductsById(mockEvent);

    expect(response.headers).toEqual(
      expect.objectContaining(getCorsHeaders(mockEvent.headers.origin)!)
    );
  });

  it("should handle requests from unknown origins", async () => {
    const mockEventUnknownOrigin =
      APIGatewayProxyEventGenerator.getProductsById({
        pathParameters: { productId: validProductId },
        origin: "http://unknown-origin.com",
      });

    const response = await getProductsById(mockEventUnknownOrigin);

    expect(response.headers?.["Access-Control-Allow-Origin"]).toBe(
      ALLOWED_ORIGINS[0]
    );
  });

  it("should return valid JSON in response body", async () => {
    const response = await getProductsById(mockEvent);

    expect(() => JSON.parse(response.body)).not.toThrow();
  });
});
