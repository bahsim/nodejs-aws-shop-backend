import { EnvironmentVariables } from "./types";
import * as dotenv from 'dotenv';

dotenv.config();

export class Configuration {
    private static validateEnv(): EnvironmentVariables {
      const required = ['FRONTEND_URL', 'PRODUCTS_TABLE_NAME', 'STOCKS_TABLE_NAME'];
      
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
        productsTableName: env.PRODUCTS_TABLE_NAME,
        stocksTableName: env.STOCKS_TABLE_NAME,
        debug: env.DEBUG_MODE,
        region: env.REGION || 'eu-west-1',
      };
    }  
  }