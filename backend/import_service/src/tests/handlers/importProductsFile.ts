import { APIGatewayProxyEvent } from 'aws-lambda';
import { beforeEach, describe, it, expect } from '@jest/globals';
import { importProductsFile } from '../handlers/importProductsFile';
import { S3 } from 'aws-sdk';
import { mockClient } from 'aws-sdk-client-mock';

const s3Mock = mockClient(S3);

describe('importProductsFile handler', () => {
  const mockSignedUrl = 'https://XXXXXXXXXXXXXXXXXXXXXXXXXXXX/uploaded/test.csv';
  
  beforeEach(() => {
    s3Mock.reset();
    process.env.BUCKET_NAME = 'XXXXXXXXXXX';
    process.env.UPLOADED_FOLDER = 'uploaded';
  });

  it('should return signed URL when valid filename provided', async () => {
    // Arrange
    s3Mock.on(S3.prototype.getSignedUrl).returns(mockSignedUrl);
    
    const event = {
      queryStringParameters: {
        name: 'test.csv'
      }
    } as unknown as APIGatewayProxyEvent;

    // Act
    const response = await importProductsFile(event);

    // Assert
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({
      url: mockSignedUrl
    });
    expect(s3Mock).toHaveReceivedCommandWith(S3.prototype.getSignedUrl, {
      Bucket: 'XXXXXXXXXXX',
      Key: 'uploaded/test.csv',
      Expires: 60,
      ContentType: 'text/csv'
    });
  });

  it('should return 400 when filename is missing', async () => {
    // Arrange
    const event = {
      queryStringParameters: null
    } as unknown as APIGatewayProxyEvent;

    // Act
    const response = await importProductsFile(event);

    // Assert
    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body)).toEqual({
      message: 'File name is required'
    });
  });

  it('should return 400 when file extension is not CSV', async () => {
    // Arrange
    const event = {
      queryStringParameters: {
        name: 'test.txt'
      }
    } as unknown as APIGatewayProxyEvent;

    // Act
    const response = await importProductsFile(event);

    // Assert
    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body)).toEqual({
      message: 'Only CSV files are allowed'
    });
  });

  it('should return 500 when S3 service fails', async () => {
    // Arrange
    s3Mock.on(S3.prototype.getSignedUrl).rejects(new Error('S3 Error'));
    
    const event = {
      queryStringParameters: {
        name: 'test.csv'
      }
    } as unknown as APIGatewayProxyEvent;

    // Act
    const response = await importProductsFile(event);

    // Assert
    expect(response.statusCode).toBe(500);
    expect(JSON.parse(response.body)).toEqual({
      message: 'Internal server error'
    });
  });
});
