import { createServer, IncomingMessage, ServerResponse } from "http";
import { config } from "./config";
import { handleRequest } from "./handlers/requestHandler";

const server = createServer(
  async (req: IncomingMessage, res: ServerResponse) => {
    try {
      // Enable CORS
      res.setHeader(
        "Access-Control-Allow-Origin",
        config.cors.allowedOrigins.join(",")
      );
      res.setHeader(
        "Access-Control-Allow-Methods",
        config.cors.allowedMethods.join(",")
      );
      res.setHeader(
        "Access-Control-Allow-Headers",
        config.cors.allowedHeaders.join(",")
      );

      if (req.method === "OPTIONS") {
        res.writeHead(200);
        res.end();
        return;
      }

      if (req.url === "/health") {
        res.writeHead(200);
        res.end(JSON.stringify({ status: "healthy" }));
        return;
      }

      await handleRequest(req, res);
    } catch (error) {
      console.error("Server error:", error);
      res.writeHead(500);
      res.end(JSON.stringify({ error: "Internal Server Error" }));
    }
  }
);

const PORT = config.port;
server.listen(PORT, () => {
  console.log(`BFF Service running on port ${PORT}`);
});
