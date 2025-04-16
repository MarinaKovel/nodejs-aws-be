import { IncomingMessage, ServerResponse, OutgoingHttpHeaders } from 'http';
import axios, { AxiosError, AxiosRequestConfig } from 'axios';

interface RequestHandlerParams {
  req: IncomingMessage;
  res: ServerResponse;
  serviceUrl: string;
  serviceName: string;
  pathSegments: string[];
  queryParams: URLSearchParams;
  body: any;
}

export const handleRequest = async ({
  req,
  res,
  serviceUrl,
  serviceName,
  pathSegments,
  queryParams,
  body
}: RequestHandlerParams): Promise<void> => {
  try {
    // Remove the service name from the path
    const servicePath = pathSegments.slice(1).join('/');
    
    // Build target URL - ensure proper URL construction
    let targetUrl = new URL(
      servicePath,
      serviceUrl.endsWith('/') ? serviceUrl : `${serviceUrl}/`
    ).toString();

    // Add query parameters if they exist
    if (queryParams.toString()) {
      const path = queryParams.get('path')?.slice(1);
      if (path) targetUrl += path;
    }

    console.log(`Forwarding request to: ${targetUrl}`);

    const axiosConfig: AxiosRequestConfig = {
      method: req.method || 'GET',
      url: targetUrl,
      headers: {
        'Content-Type': 'application/json',
        ...(req.headers.authorization && {
          'Authorization': req.headers.authorization
        })
      },
      validateStatus: () => true, // Don't throw on non-2xx responses
      maxRedirects: 5,
      timeout: 5000 // 5 second timeout
    };

    // Only add body for POST, PUT, PATCH methods
    if (body && ['POST', 'PUT', 'PATCH'].includes(req.method || '')) {
      axiosConfig.data = body;
    }

    const response = await axios(axiosConfig);

    // Convert Axios headers to OutgoingHttpHeaders
    const responseHeaders: OutgoingHttpHeaders = {
      'Content-Type': 'application/json'
    };

    // Safely copy headers
    if (response.headers) {
      Object.entries(response.headers).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            responseHeaders[key.toLowerCase()] = value;
          } else {
            responseHeaders[key.toLowerCase()] = String(value);
          }
        }
      });
    }

    // Forward response
    res.writeHead(response.status, responseHeaders);
    
    // Ensure we're sending JSON
    const responseData = typeof response.data === 'string' 
      ? response.data 
      : JSON.stringify(response.data);
    
    res.end(responseData);

  } catch (error) {
    console.error('Request failed:', error);
    
    const axiosError = error as AxiosError;
    const statusCode = axiosError.response?.status || 502;
    
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      error: 'Cannot process request',
      details: axiosError.message
    }));
  }
};
