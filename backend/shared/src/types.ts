import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

export interface EnvironmentVariables {
  FRONTEND_URL: string;
  PRODUCTS_TABLE_NAME: string;
  STOCKS_TABLE_NAME: string;
  DEBUG_MODE?: string;
  REGION?: string;
}

export interface CorsHeaders {
  [header: string]: string;
  "Access-Control-Allow-Origin": string;
  "Access-Control-Allow-Credentials": string;
  "Access-Control-Allow-Methods": string;
  "Access-Control-Allow-Headers": string;
}

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  count: number;
}

export type LambdaHandlerType = (
  event: APIGatewayProxyEvent,
  headers: CorsHeaders
) => Promise<APIGatewayProxyResult>;
