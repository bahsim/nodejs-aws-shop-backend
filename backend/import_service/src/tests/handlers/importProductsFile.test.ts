import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Configuration } from "../../../../shared/src/config";
import { APIGatewayProxyEventGenerator } from "../utils/eventGenerator";
import { importProductsFile } from "../../handlers/importProductsFile";

jest.mock("@aws-sdk/client-s3");
jest.mock("@aws-sdk/s3-request-presigner");
jest.mock("../../../../shared/src/config");

describe("importProductsFile Lambda", () => {
  const mockSignedUrl = "https://mock-signed-url.com";
  const mockGetConfig = jest.fn();

  beforeEach(() => {
    (getSignedUrl as jest.Mock).mockResolvedValue(mockSignedUrl);
    Configuration.getConfig = mockGetConfig;
    mockGetConfig.mockReturnValue({
      bucketName: "XXXXXXXXXXX",
      uploadFolder: "uploaded",
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // 1. Input Validation Tests
  describe("Input Validation", () => {
    it("should handle empty file name", async () => {
      const event = APIGatewayProxyEventGenerator.importProductsFile({
        name: "",
      });
      const response = await importProductsFile(event);
      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body)).toEqual({
        message: "Filename is required",
      });
    });

    it("should handle whitespace-only file name", async () => {
      const event = APIGatewayProxyEventGenerator.importProductsFile({
        name: "   ",
      });
      const response = await importProductsFile(event);
      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body)).toEqual({
        message: "Filename is required",
      });
    });

    it("should handle special characters in file name", async () => {
      const event = APIGatewayProxyEventGenerator.importProductsFile({
        name: "file!@#$%^&*.csv",
      });
      const response = await importProductsFile(event);
      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body)).toEqual({
        message: "Invalid file name",
      });
    });

    it("should handle very long file name", async () => {
      const longFileName = "a".repeat(1024) + ".csv";
      const event = APIGatewayProxyEventGenerator.importProductsFile({
        name: longFileName,
      });
      const response = await importProductsFile(event);
      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body)).toEqual({
        message: "Filename too long",
      });
    });

    it("should handle missing name parameter", async () => {
      const event = APIGatewayProxyEventGenerator.importProductsFile({});
      const response = await importProductsFile(event);
      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body)).toEqual({
        message: "Filename is required",
      });
    });

    it("should handle non-csv file extension", async () => {
      const event = APIGatewayProxyEventGenerator.importProductsFile({
        name: "test.txt",
      });
      const response = await importProductsFile(event);
      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body)).toEqual({
        message: "Only CSV files are supported",
      });
    });
  });

  // 2. Environment Variable Tests
  describe("Environment Variables", () => {
    it("should handle missing bucket name", async () => {
      const event = APIGatewayProxyEventGenerator.importProductsFile({
        name: "test.csv",
      });
      mockGetConfig.mockReturnValue({
        uploadFolder: "uploaded",
      });

      const response = await importProductsFile(event);

      expect(response.statusCode).toBe(500);
      expect(JSON.parse(response.body)).toEqual({
        message: "Missing bucket configuration",
      });
    });

    it("should handle missing upload folder", async () => {
      const event = APIGatewayProxyEventGenerator.importProductsFile({
        name: "test.csv",
      });
      mockGetConfig.mockReturnValue({
        bucketName: "XXXXXXXXXXX",
      });

      const response = await importProductsFile(event);

      expect(response.statusCode).toBe(500);
      expect(JSON.parse(response.body)).toEqual({
        message: "Missing upload folder configuration",
      });
    });

    it("should handle empty configuration values", async () => {
      const event = APIGatewayProxyEventGenerator.importProductsFile({
        name: "test.csv",
      });
      mockGetConfig.mockReturnValue({
        bucketName: "",
        uploadFolder: "",
      });

      const response = await importProductsFile(event);

      expect(response.statusCode).toBe(500);
      expect(JSON.parse(response.body)).toEqual({
        message: "Missing bucket configuration",
      });
    });
  });

  // 3. S3 Service Error Cases
  describe("S3 Service Errors", () => {
    it("should handle permission denied errors", async () => {
      (getSignedUrl as jest.Mock).mockRejectedValue(new Error("Access Denied"));
      const event = APIGatewayProxyEventGenerator.importProductsFile({
        name: "test.csv",
      });
      const response = await importProductsFile(event);
      expect(response.statusCode).toBe(500);
      expect(JSON.parse(response.body)).toEqual({
        message: "Internal server error while creating product",
      });
    });
  });

  // 4. Security Tests
  describe("Security Tests", () => {
    it("should prevent path traversal attempts", async () => {
      const event = APIGatewayProxyEventGenerator.importProductsFile({
        name: "../../../etc/passwd.csv",
      });
      const response = await importProductsFile(event);
      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body)).toEqual({
        message: "Invalid file name",
      });
    });

    it("should handle malicious script in file name", async () => {
      const event = APIGatewayProxyEventGenerator.importProductsFile({
        name: "<script>alert(1)</script>.csv",
      });
      const response = await importProductsFile(event);
      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body)).toEqual({
        message: "Invalid file name",
      });
    });

    it("should handle URL encoding injection", async () => {
      const event = APIGatewayProxyEventGenerator.importProductsFile({
        name: "%2e%2e%2f%2e%2e%2f.csv",
      });
      const response = await importProductsFile(event);
      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body)).toEqual({
        message: "Invalid file name",
      });
    });
  });

  // 5. Edge Cases
  describe("Edge Cases", () => {
    it("should handle unicode characters in file name", async () => {
      const event = APIGatewayProxyEventGenerator.importProductsFile({
        name: "файл.csv",
      });
      const response = await importProductsFile(event);
      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual({ signedUrl: mockSignedUrl });
    });

    it("should handle case sensitivity", async () => {
      const event = APIGatewayProxyEventGenerator.importProductsFile({
        name: "TEST.CSV",
      });
      const response = await importProductsFile(event);
      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual({ signedUrl: mockSignedUrl });
    });

    it("should handle multiple file extensions", async () => {
      const event = APIGatewayProxyEventGenerator.importProductsFile({
        name: "test.txt.csv",
      });
      const response = await importProductsFile(event);
      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body)).toEqual({
        message: "Invalid file name",
      });
    });
  });

  // 6. Happy Path Tests
  describe("Happy Path", () => {
    it("should successfully generate signed URL for valid CSV", async () => {
      const event = APIGatewayProxyEventGenerator.importProductsFile({
        name: "valid-file.csv",
      });
      const response = await importProductsFile(event);
      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual({
        signedUrl: mockSignedUrl,
      });
    });

    it("should handle valid file name with numbers", async () => {
      const event = APIGatewayProxyEventGenerator.importProductsFile({
        name: "file123.csv",
      });
      const response = await importProductsFile(event);
      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual({
        signedUrl: mockSignedUrl,
      });
    });

    it("should handle valid file name with hyphens and underscores", async () => {
      const event = APIGatewayProxyEventGenerator.importProductsFile({
        name: "my-file_name.csv",
      });
      const response = await importProductsFile(event);
      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual({
        signedUrl: mockSignedUrl,
      });
    });
  });
});
