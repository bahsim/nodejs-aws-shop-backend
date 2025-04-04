import { ServiceName } from "../types";

export function parseUrl(url: string | undefined) {
  if (!url) return { serviceName: null, path: '', queryString: '' };

  const [pathPart, query] = url.split('?');
  const parts = pathPart.split('/').filter(Boolean);
  
  return {
    serviceName: parts[0] as ServiceName  | null,
    path: parts.length > 1 ? '/' + parts.slice(1).join('/') : '',
    queryString: query ? `?${query}` : ''
  };
}
