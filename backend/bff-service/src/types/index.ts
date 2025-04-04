export type ServiceName = 'cart' | 'product';

export interface ServiceResponse {
  status: number;
  data: any;
}

export interface ParsedUrl {
  serviceName: ServiceName | null;
  path: string;
  queryString: string;
}
