import { S3Event } from "aws-lambda";
import { importFileParser } from "../../handlers/importFileParser";
import {
  S3Client,
  GetObjectCommand,
  S3ServiceException,
} from "@aws-sdk/client-s3";
import { mockClient } from "aws-sdk-client-mock";
import { sdkStreamMixin } from "@aws-sdk/util-stream-node";
import { Readable } from "stream";

jest.mock("../../../../shared/src/config", () => ({
  Configuration: {
    getConfig: jest.fn().mockReturnValue({
      uploadFolder: "uploaded/",
      parsedFolder: "parsed/",
    }),
  },
}));

// Helper function to create mock stream
const createMockStream = (content: string) => {
  const stream = new Readable();
  stream.push(content);
  stream.push(null);
  return sdkStreamMixin(stream);
};

// Mock S3 client
const s3Mock = mockClient(S3Client);

// Sample valid S3 event
const createS3Event = (records: any[] = []): S3Event => ({
  Records:
    records.length > 0
      ? records
      : [
          {
            eventVersion: "2.0",
            eventSource: "aws:s3",
            awsRegion: "us-east-1",
            eventTime: new Date().toISOString(),
            eventName: "ObjectCreated:Put",
            userIdentity: {
              principalId: "EXAMPLE",
            },
            requestParameters: {
              sourceIPAddress: "127.0.0.1",
            },
            responseElements: {
              "x-amz-request-id": "EXAMPLE123456789",
              "x-amz-id-2":
                "EXAMPLE123/5678abcdefghijklambdaisawesome/mnopqrstuvwxyzABCDEFGH",
            },
            s3: {
              s3SchemaVersion: "1.0",
              configurationId: "testConfigRule", // Added the required configurationId
              bucket: {
                name: "test-bucket",
                ownerIdentity: {
                  principalId: "EXAMPLE",
                },
                arn: "arn:aws:s3:::test-bucket",
              },
              object: {
                key: "uploaded/test-file.csv",
                size: 1024,
                eTag: "0123456789abcdef0123456789abcdef",
                sequencer: "0A1B2C3D4E5F678901",
              },
            },
          },
        ],
});

describe("importFileParser Lambda Handler", () => {
  beforeEach(() => {
    s3Mock.reset();
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  // Happy Path Tests
  describe("Happy Path", () => {
    it("should process valid S3 event with single file successfully", async () => {
      const mockContent = "header1,header2\nvalue1,value2";
      s3Mock.on(GetObjectCommand).resolves({
        Body: createMockStream(mockContent),
      });

      const event = createS3Event();
      await expect(importFileParser(event)).resolves.not.toThrow();
    });

    it("should process multiple records in S3 event", async () => {
      const mockContent = "header1,header2\nvalue1,value2";
      const multipleRecords = [
        {
          s3: { bucket: { name: "test-bucket" }, object: { key: "file1.csv" } },
        },
        {
          s3: { bucket: { name: "test-bucket" }, object: { key: "file2.csv" } },
        },
      ];

      s3Mock.on(GetObjectCommand).resolves({
        Body: createMockStream(mockContent),
      });

      const event = createS3Event(multipleRecords);
      await expect(importFileParser(event)).resolves.not.toThrow();
    });
  });

  // Input Validation Tests
  describe("Input Validation", () => {
    it("should handle empty S3 event", async () => {
      // Create an empty event
      const emptyEvent: S3Event = {
        Records: [],
      };

      await expect(importFileParser(emptyEvent)).resolves.not.toThrow();
    });

    it("should handle malformed S3 event structure", async () => {
      const malformedEvent = { Records: [{ invalid: "data" }] } as any;
      await expect(importFileParser(malformedEvent)).rejects.toThrow();
    });

    it("should handle missing bucket name", async () => {
      const eventWithoutBucket = createS3Event([
        {
          s3: { object: { key: "test.csv" } },
        },
      ] as any);
      await expect(importFileParser(eventWithoutBucket)).rejects.toThrow();
    });

    it("should handle missing object key", async () => {
      const eventWithoutKey = createS3Event([
        {
          s3: { bucket: { name: "test-bucket" } },
        },
      ] as any);
      await expect(importFileParser(eventWithoutKey)).rejects.toThrow();
    });
  });

  // Error Handling Tests
  describe("Error Handling", () => {
    beforeEach(() => {
      s3Mock.reset();
    });

    it("should handle S3 service errors", async () => {
      // Mock the S3 client to reject with an error
      s3Mock.on(GetObjectCommand).rejects(
        new S3ServiceException({
          name: "S3ServiceException",
          message: "S3 Service Error",
          $fault: "client",
          $metadata: {
            httpStatusCode: 500,
            requestId: "test-request-id",
          },
        })
      );

      const event = createS3Event();

      await expect(importFileParser(event)).rejects.toThrow("S3 Service Error");
    });

    it("should handle S3 service errors", async () => {
      // Create a specific S3 error
      const s3Error = {
        name: "S3ServiceException",
        message: "S3 Service Error",
        $metadata: {
          httpStatusCode: 500,
          requestId: "test-request-id",
        },
      };

      // Mock the S3 client to reject with this error
      s3Mock.on(GetObjectCommand).rejects(s3Error);

      const event = createS3Event();
      await expect(importFileParser(event)).rejects.toThrow("S3 Service Error");
    });

    it("should handle corrupted file content", async () => {
      const mockContent = "invalid,data\nincomplete";
      s3Mock.on(GetObjectCommand).resolves({
        Body: createMockStream(mockContent),
      });
      const event = createS3Event();
      await expect(importFileParser(event)).rejects.toThrow();
    });

    it("should handle empty file content", async () => {
      const mockContent = "";
      s3Mock.on(GetObjectCommand).resolves({
        Body: createMockStream(mockContent),
      });
      const event = createS3Event();
      await expect(importFileParser(event)).resolves.not.toThrow();
    });
  });

  // Edge Cases
  describe("Edge Cases", () => {
    it("should handle zero byte files", async () => {
      const mockContent = "";
      s3Mock.on(GetObjectCommand).resolves({
        Body: createMockStream(mockContent),
      });

      const zeroByteEvent = createS3Event([
        {
          s3: {
            bucket: { name: "test-bucket" },
            object: { key: "empty.csv", size: 0 },
          },
        },
      ]);

      await expect(importFileParser(zeroByteEvent)).resolves.not.toThrow();
    });

    it("should handle maximum path length", async () => {
      const mockContent = "header1,header2\nvalue1,value2";
      const longPath = "a".repeat(1024) + ".csv";
      const eventWithLongPath = createS3Event([
        {
          s3: {
            bucket: { name: "test-bucket" },
            object: { key: longPath },
          },
        },
      ]);

      s3Mock.on(GetObjectCommand).resolves({
        Body: createMockStream(mockContent),
      });

      await expect(importFileParser(eventWithLongPath)).resolves.not.toThrow();
    });
  });

  // Permission Tests
  describe("Permission Handling", () => {
    it("should handle S3 access denied errors", async () => {
      s3Mock.on(GetObjectCommand).rejects({
        name: "AccessDenied",
        message: "Access Denied",
      });

      const event = createS3Event();
      await expect(importFileParser(event)).rejects.toThrow("Access Denied");
    });

    it("should handle non-existent bucket", async () => {
      s3Mock.on(GetObjectCommand).rejects({
        name: "NoSuchBucket",
        message: "The specified bucket does not exist",
      });

      const event = createS3Event();
      await expect(importFileParser(event)).rejects.toThrow(
        "The specified bucket does not exist"
      );
    });
  });
});
