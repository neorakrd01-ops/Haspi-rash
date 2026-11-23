// Used by the desktop shortcut to check whether Aspi Rash is already running.
export function GET() {
  return Response.json({ ok: true, app: "aspi-rash" });
}
