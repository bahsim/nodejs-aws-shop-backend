import { IncomingMessage, ServerResponse } from 'http';
import { ProxyService } from '../services/ProxyService';
import { CacheService } from '../services/CacheService';
import { parseUrl } from '../utils/urlParser';
import { config } from '../config';

const cacheService = new CacheService(120); // 2 minutes cache
const proxyService = new ProxyService();

export async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  const { serviceName, path, queryString } = parseUrl(req.url);

  if (!serviceName) {
    res.writeHead(400);
    res.end(JSON.stringify({ error: 'Service name not provided' }));
    return;
  }

  const serviceUrl = config.services[serviceName];

  if (!serviceUrl) {
    res.writeHead(502);
    res.end(JSON.stringify({ error: 'Cannot process request' }));
    return;
  }

  try {
    // Handle caching for products list
    if (serviceName === 'product' && req.method === 'GET' && path === '/products') {
      const cachedData = cacheService.get('productsList');
      if (cachedData) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(cachedData));
        return;
      }
    }

    const response = await proxyService.forwardRequest(
      req, 
      serviceUrl, 
      path, 
      queryString
    );

    // Cache products list response
    if (serviceName === 'product' && req.method === 'GET' && path === '/products') {
      cacheService.set('productsList', response.data);
    }

    res.writeHead(response.status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(response.data));

  } catch (error: any) {
    const status = error.response?.status || 502;
    const message = error.response?.data || 'Cannot process request';
    
    res.writeHead(status);
    res.end(JSON.stringify({ error: message }));
  }
}
