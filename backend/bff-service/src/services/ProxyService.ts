import { IncomingMessage } from 'http';
import * as https from 'https';
import * as http from 'http';
import { ServiceResponse } from '../types';

export class ProxyService {
  async forwardRequest(
    originalReq: IncomingMessage, 
    baseUrl: string, 
    path: string, 
    queryString: string
  ): Promise<ServiceResponse> {
    return new Promise((resolve, reject) => {
      const url = new URL(baseUrl + path + queryString);
      
      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search,
        method: originalReq.method || 'GET',
        headers: {
          ...originalReq.headers,
          host: url.hostname
        }
      };

      const protocol = url.protocol === 'https:' ? https : http;

      const proxyReq = protocol.request(options, (proxyRes) => {
        let data = '';

        proxyRes.on('data', (chunk) => {
          data += chunk;
        });

        proxyRes.on('end', () => {
          try {
            resolve({
              status: proxyRes.statusCode || 500,
              data: data ? JSON.parse(data) : null
            });
          } catch (error) {
            reject(error);
          }
        });
      });

      proxyReq.on('error', (error) => {
        reject(error);
      });

      if (['POST', 'PUT', 'PATCH'].includes(originalReq.method || 'GET')) {
        let body = '';
        originalReq.on('data', chunk => {
          body += chunk;
        });
        originalReq.on('end', () => {
          proxyReq.end(body);
        });
      } else {
        proxyReq.end();
      }
    });
  }
}
