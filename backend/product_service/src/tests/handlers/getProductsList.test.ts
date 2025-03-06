import { APIGatewayProxyEvent } from "aws-lambda";
import { products, stocks } from "../mockData";
import { getProductsList } from "../../handlers/getProductsList";
import { APIGatewayProxyEventGenerator } from "../utils/eventGenerator";
import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { ALLOWED_ORIGINS } from "../../../../shared/src/constants";
import { getCorsHeaders } from "../../../../shared/src/cors";

jest.mock("@aws-sdk/lib-dynamodb", () => ({
  DynamoDBDocumentClient: {
    from: jest.fn(() => ({
      send: jest.fn((command) => {
        // @ts-ignore
        const tableName = command.TableName;

        if (tableName === "products") {
          return Promise.resolve({ Items: products } as never);
        } else if (tableName === "stocks") {
          return Promise.resolve({ Items: stocks } as never);
        }
        return Promise.reject(new Error("Unknown table"));
      }),
    })),
  },
  ScanCommand: jest.fn().mockImplementation((params) => params),
}));

describe("getProductsList Lambda handler", () => {
  let mockEvent: APIGatewayProxyEvent;

  beforeEach(() => {
    jest.clearAllMocks();
    mockEvent = APIGatewayProxyEventGenerator.getProductsList({
      origin: "http://localhost:3000",
    });
  });

  it("should return all products with status 200", async () => {
    const response = await getProductsList(mockEvent);

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual(products);
  });

  it("should include CORS headers in response", async () => {
    const response = await getProductsList(mockEvent);

    expect(response.headers).toEqual(
      expect.objectContaining(getCorsHeaders(mockEvent.headers.origin)!)
    );
  });

  it("should handle requests from unknown origins", async () => {
    const mockEventUnknownOrigin = APIGatewayProxyEventGenerator.getProductsList({
      origin: "http://unknown-origin.com",
    });

    const response = await getProductsList(mockEventUnknownOrigin);

    expect(response.headers?.["Access-Control-Allow-Origin"]).toBe(
      ALLOWED_ORIGINS[0]
    );
  });
  it("should return valid JSON in response body", async () => {
    const response = await getProductsList(mockEvent);

    expect(() => JSON.parse(response.body)).not.toThrow();

    const parsedBody = JSON.parse(response.body);

    expect(Array.isArray(parsedBody)).toBe(true);
  });
});
