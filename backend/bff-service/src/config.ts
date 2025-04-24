interface ServiceUrls {
  cart: string;
  product: string;
}

interface CorsConfig {
  allowedOrigins: string[];
  allowedMethods: string[];
  allowedHeaders: string[];
}

interface Config {
  port: number;
  services: ServiceUrls;
  cors: CorsConfig;
}

export const config: Config = {
  port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
  services: {
    cart: process.env.CART_SERVICE_URL || 'http://localhost:3001',
    product: process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002'
  },
  cors: {
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['*'],
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }
};
