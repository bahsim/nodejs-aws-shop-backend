import { catalogBatchProcess } from "../../handlers/catalogBatchProcess";
import { mockClient } from "aws-sdk-client-mock";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { SQSEvent } from "aws-lambda";
import {
  describe,
  it,
  jest,
  expect,
  beforeEach,
  afterEach,
} from "@jest/globals";
import { PublishCommandInput } from "@aws-sdk/client-sns";

const ddbMock = mockClient(DynamoDBDocumentClient);
const snsMock = mockClient(SNSClient);

describe("catalogBatchProcess Lambda", () => {
  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => {});

    ddbMock.reset();
    snsMock.reset();
    process.env.PRODUCTS_TABLE_NAME = "test-table";
    process.env.SNS_TOPIC_ARN = "test-topic-arn";
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // 1. Unit Tests for SQS Message Processing
  describe("SQS Message Processing", () => {
    it("should process valid single record successfully", async () => {
      const event: SQSEvent = {
        Records: [
          {
            body: JSON.stringify({
              title: "Test Product",
              description: "Test Description",
              price: 100,
              count: 10,
            }),
            messageId: "1",
            receiptHandle: "",
            attributes: {
              ApproximateReceiveCount: "",
              SentTimestamp: "",
              SenderId: "",
              ApproximateFirstReceiveTimestamp: "",
            },
            messageAttributes: {},
            md5OfBody: "",
            eventSource: "",
            eventSourceARN: "",
            awsRegion: "",
          },
        ],
      };

      ddbMock.on(PutCommand).resolves({});
      snsMock.on(PublishCommand).resolves({});

      await catalogBatchProcess(event);

      expect(ddbMock.calls()).toHaveLength(1);
      expect(snsMock.calls()).toHaveLength(1);
    });

    it("should handle empty records array", async () => {
      const event: SQSEvent = { Records: [] };
      await catalogBatchProcess(event);
      expect(ddbMock.calls()).toHaveLength(0);
      expect(snsMock.calls()).toHaveLength(0);
    });

    it("should handle invalid JSON in message body", async () => {
      const event: SQSEvent = {
        Records: [
          {
            body: "invalid-json",
            messageId: "1",
            receiptHandle: "",
            attributes: {
              ApproximateReceiveCount: "",
              SentTimestamp: "",
              SenderId: "",
              ApproximateFirstReceiveTimestamp: "",
            },
            messageAttributes: {},
            md5OfBody: "",
            eventSource: "",
            eventSourceARN: "",
            awsRegion: "",
          },
        ],
      };

      await expect(catalogBatchProcess(event)).rejects.toThrow(SyntaxError);
      await expect(catalogBatchProcess(event)).rejects.toThrow(
        "Unexpected token"
      );
    });
  });

  // 2. Integration Tests for DynamoDB
  describe("DynamoDB Integration", () => {
    it("should handle DynamoDB put failure", async () => {
      const event: SQSEvent = {
        Records: [
          {
            body: JSON.stringify({
              title: "Test Product",
              description: "Test Description",
              price: 100,
              count: 10,
            }),
          },
        ],
      } as any;

      ddbMock.on(PutCommand).rejects(new Error("DynamoDB error"));

      await expect(catalogBatchProcess(event)).rejects.toThrow(
        "DynamoDB error"
      );
    });

    it("should handle missing required fields", async () => {
      const invalidProduct = {
        description: "Test Description",
        price: 100,
        // missing required 'title' and 'count' fields
      };

      const event: SQSEvent = {
        Records: [
          {
            body: JSON.stringify(invalidProduct),
            messageId: "test-message-id",
            receiptHandle: "",
            attributes: {
              ApproximateReceiveCount: "",
              SentTimestamp: "",
              SenderId: "",
              ApproximateFirstReceiveTimestamp: "",
            },
            messageAttributes: {},
            md5OfBody: "",
            eventSource: "",
            eventSourceARN: "",
            awsRegion: "",
          },
        ],
      };

      ddbMock.on(PutCommand).resolves({});

      await expect(catalogBatchProcess(event)).rejects.toThrow(
        "Missing required fields"
      );
      expect(ddbMock.calls()).toHaveLength(0); // Ensure DynamoDB was not called
    });

    it("should handle null values in required fields", async () => {
      const invalidProduct = {
        title: null,
        description: "Test Description",
        price: 100,
        count: 10,
      };

      const event: SQSEvent = {
        Records: [
          {
            body: JSON.stringify(invalidProduct),
            messageId: "test-message-id",
            receiptHandle: "",
            attributes: {
              ApproximateReceiveCount: "",
              SentTimestamp: "",
              SenderId: "",
              ApproximateFirstReceiveTimestamp: "",
            },
            messageAttributes: {},
            md5OfBody: "",
            eventSource: "",
            eventSourceARN: "",
            awsRegion: "",
          },
        ],
      };

      ddbMock.on(PutCommand).resolves({});

      await expect(catalogBatchProcess(event)).rejects.toThrow(
        "Missing required fields"
      );
      expect(ddbMock.calls()).toHaveLength(0);
    });
  });

  // 3. Integration Tests for SNS
  describe("SNS Integration", () => {
    it("should publish correct message to SNS", async () => {
      const product = {
        title: "Test Product",
        description: "Test Description",
        price: 100,
        count: 10,
      };

      const event: SQSEvent = {
        Records: [
          {
            body: JSON.stringify(product),
          },
        ],
      } as any;

      ddbMock.on(PutCommand).resolves({});
      snsMock.on(PublishCommand).resolves({});

      await catalogBatchProcess(event);

      const snsCall = snsMock.calls()[0];
      const publishInput = snsCall.args[0].input as PublishCommandInput;
      expect(JSON.parse(publishInput.Message!)).toMatchObject({
        message: "Product created successfully",
        product: product,
      });
    });

    it("should handle SNS publish failure", async () => {
      const event: SQSEvent = {
        Records: [
          {
            body: JSON.stringify({
              title: "Test Product",
              description: "Test Description",
              price: 100,
              count: 10,
            }),
          },
        ],
      } as any;

      ddbMock.on(PutCommand).resolves({});
      snsMock.on(PublishCommand).rejects(new Error("SNS error"));

      await expect(catalogBatchProcess(event)).rejects.toThrow("SNS error");
    });
  });

  // 4. Environment Variable Tests
  describe("Environment Variables", () => {
    it("should throw error when PRODUCTS_TABLE_NAME is missing", async () => {
      delete process.env.PRODUCTS_TABLE_NAME;

      const event: SQSEvent = {
        Records: [
          {
            body: JSON.stringify({
              title: "Test Product",
              description: "Test Description",
              price: 100,
              count: 10,
            }),
          },
        ],
      } as any;

      await expect(catalogBatchProcess(event)).rejects.toThrow();
    });

    it("should throw error when SNS_TOPIC_ARN is missing", async () => {
      delete process.env.SNS_TOPIC_ARN;

      const event: SQSEvent = {
        Records: [
          {
            body: JSON.stringify({
              title: "Test Product",
              description: "Test Description",
              price: 100,
              count: 10,
            }),
          },
        ],
      } as any;

      await expect(catalogBatchProcess(event)).rejects.toThrow();
    });
  });

  // 5. Data Validation Tests
  describe("Data Validation", () => {
    it("should validate product price is positive", async () => {
      const event: SQSEvent = {
        Records: [
          {
            body: JSON.stringify({
              title: "Test Product",
              description: "Test Description",
              price: -100,
              count: 10,
            }),
          },
        ],
      } as any;

      await expect(catalogBatchProcess(event)).rejects.toThrow();
    });

    it("should validate product count is non-negative", async () => {
      const event: SQSEvent = {
        Records: [
          {
            body: JSON.stringify({
              title: "Test Product",
              description: "Test Description",
              price: 100,
              count: -1,
            }),
          },
        ],
      } as any;

      await expect(catalogBatchProcess(event)).rejects.toThrow();
    });

    it("should handle multiple records in batch", async () => {
      const event: SQSEvent = {
        Records: [
          {
            body: JSON.stringify({
              title: "Product 1",
              description: "Description 1",
              price: 100,
              count: 10,
            }),
          },
          {
            body: JSON.stringify({
              title: "Product 2",
              description: "Description 2",
              price: 200,
              count: 20,
            }),
          },
        ],
      } as any;

      ddbMock.on(PutCommand).resolves({});
      snsMock.on(PublishCommand).resolves({});

      await catalogBatchProcess(event);

      expect(ddbMock.calls()).toHaveLength(2);
      expect(snsMock.calls()).toHaveLength(2);
    });
  });
});
