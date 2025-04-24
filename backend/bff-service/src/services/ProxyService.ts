import { IncomingMessage } from "http";
import * as https from "https";
import * as http from "http";
import { ServiceResponse } from "../types";
import * as zlib from "zlib";

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
        port: url.port || (url.protocol === "https:" ? 443 : 80),
        path: url.pathname + url.search,
        method: originalReq.method || "GET",
        headers: {
          ...originalReq.headers,
          host: url.hostname,
          "accept-encoding": "gzip, deflate",
        },
      };

      const protocol = url.protocol === "https:" ? https : http;

      const proxyReq = protocol.request(options, (proxyRes) => {
        const chunks: Buffer[] = [];

        proxyRes.on("data", (chunk: Buffer) => {
          chunks.push(chunk);
        });

        proxyRes.on("end", () => {
          try {
            const buffer = Buffer.concat(chunks);

            // Handle different content encodings
            const contentEncoding = proxyRes.headers["content-encoding"];
            if (contentEncoding === "gzip") {
              zlib.gunzip(buffer, (err, decoded) => {
                if (err) {
                  console.error("Gunzip error:", err);
                  reject(err);
                  return;
                }
                this.handleDecodedData(
                  decoded.toString(),
                  proxyRes.statusCode,
                  resolve,
                  reject
                );
              });
            } else if (contentEncoding === "deflate") {
              zlib.inflate(buffer, (err, decoded) => {
                if (err) {
                  console.error("Inflate error:", err);
                  reject(err);
                  return;
                }
                this.handleDecodedData(
                  decoded.toString(),
                  proxyRes.statusCode,
                  resolve,
                  reject
                );
              });
            } else {
              // No compression
              this.handleDecodedData(
                buffer.toString(),
                proxyRes.statusCode,
                resolve,
                reject
              );
            }
          } catch (error) {
            console.error("Error processing response:", error);
            reject(error);
          }
        });
      });

      proxyReq.on("error", (error) => {
        console.error("Proxy request error:", error);
        reject(error);
      });

      if (["POST", "PUT", "PATCH"].includes(originalReq.method || "GET")) {
        let body = "";
        originalReq.on("data", (chunk) => {
          body += chunk;
        });
        originalReq.on("end", () => {
          proxyReq.end(body);
        });
      } else {
        proxyReq.end();
      }
    });
  }

  private handleDecodedData(
    data: string,
    statusCode: number | undefined,
    resolve: (value: ServiceResponse) => void,
    reject: (reason?: any) => void
  ) {
    try {
      // Remove BOM and trim
      const cleanData = data.replace(/^\uFEFF/, "").trim();
      console.log("Decoded response:", cleanData);

      const parsedData = cleanData ? JSON.parse(cleanData) : null;
      resolve({
        status: statusCode || 500,
        data: parsedData,
      });
    } catch (error) {
      console.error("Error parsing JSON:", error);
      console.error("Raw decoded data:", data);
      reject(error);
    }
  }
}
