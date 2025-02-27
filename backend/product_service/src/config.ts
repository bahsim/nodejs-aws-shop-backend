import { DatabaseConfig, EnvironmentVariables } from "./types";
import * as dotenv from 'dotenv';

dotenv.config();

export class Configuration {
    private static validateEnv(): EnvironmentVariables {
      const required = ['FRONTEND_URL'];
      
      for (const item of required) {
        if (!process.env[item]) {
          throw new Error(`Missing required environment variable: ${item}`);
        }
      }
  
      return process.env as unknown as EnvironmentVariables;
    }
  
    public static getConfig() {
      const env = this.validateEnv();
      
      return {
        frontendUrl: env.FRONTEND_URL,
        databaseUrl: env.DATABASE_URL,
        debug: env.DEBUG_MODE,
        region: env.REGION || 'eu-west-1',
      };
    }
  
    public static getDatabaseConfig(): DatabaseConfig {
      const dbUrl = new URL(process.env.DATABASE_URL || '');
      
      return {
        host: dbUrl.hostname,
        port: parseInt(dbUrl.port, 10),
        username: dbUrl.username,
        password: dbUrl.password
      };
    }
  }