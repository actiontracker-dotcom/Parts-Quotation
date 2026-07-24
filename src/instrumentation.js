export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  try {
    const { preloadAll } = await import(
      "@/lib/services/googleSheetsService"
    );
    preloadAll().catch((err) => {
      console.warn("[instrumentation] Background preload failed:", err.message);
    });
  } catch (err) {
    console.warn("[instrumentation] Could not start preload:", err.message);
  }
}
