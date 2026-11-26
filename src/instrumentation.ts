export async function register() {
  if (
    process.env.NEXT_RUNTIME === "nodejs" &&
    process.env.PARAISO_DEMO_MODE === "true"
  ) {
    const { ensureDemoDatabase } = await import("./lib/booking/demo-mode");
    await ensureDemoDatabase();
  }
}
