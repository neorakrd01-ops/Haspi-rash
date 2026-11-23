// Runs once when the Aspi Rash server starts: makes the daily backup if one
// is due, then checks again every hour while the app is running.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startBackupScheduler } = await import("./lib/backup");
    startBackupScheduler();
  }
}
