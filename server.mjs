import { createServer } from "http";
import { parse } from "url";
import next from "next";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
  // Preload Google Sheets caches in the background so the first user
  // request rarely blocks on cold sheet reads.  The server starts
  // listening immediately — preload never blocks startup.
  import("./src/lib/services/googleSheetsService.js")
    .then(({ preloadAll }) => {
      preloadAll()
        .then(() => {
          console.log("[server] All caches preloaded successfully");
        })
        .catch((err) => {
          console.warn("[server] Cache preload failed:", err.message);
        });
    })
    .catch((err) => {
      console.warn("[server] Cache preload module load failed:", err.message);
    });

  createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(port, () => {
    console.log(
      `> Server ready on http://${hostname}:${port} (${dev ? "development" : "production"})`
    );
  });
});
