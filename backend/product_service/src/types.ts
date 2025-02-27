export interface EnvironmentVariables {
  FRONTEND_URL: string;
  DATABASE_URL: string;
  DEBUG_MODE?: string;
  REGION?: string;
}

export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
}

export interface CorsHeaders {
  [header: string]: string;
  "Access-Control-Allow-Origin": string;
  "Access-Control-Allow-Credentials": string;
  "Access-Control-Allow-Methods": string;
  "Access-Control-Allow-Headers": string;
}
