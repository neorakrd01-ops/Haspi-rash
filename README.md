# Aspi Rash — Import/Export Manager

A web app that runs on this PC and is opened in the browser at http://127.0.0.1:3210. Only this computer can reach it.

## Everyday use
- **Start:** double-click **Aspi Rash** on the desktop. The browser opens automatically.
- **Stop:** double-click **Stop Aspi Rash**.

## What Phase 1 does
- Shipments (import/export) with several products each, a currency on every amount, and costs (freight, insurance, duty, fees, local transport, other). Totals are shown per currency.
- Statuses: Ordered → Shipped → In transit → At customs → Delivered, plus On hold, Held/rejected at customs, Returned, Damaged/short and Cancelled. Change the status directly from the list.
- Search by reference, party, product, container, B/L or tracking number. Filter by type and status, and sort by date.
- **Archive** instead of delete: you can always restore a shipment.
- **History** on every shipment: who changed what, and when.
- **Backups:** automatic when the app starts and then every 24 hours, plus a "Back up now" button. Set the folder on the Backups page. Use a USB drive or a cloud-synced folder.

## Restore a backup
1. Stop Aspi Rash.
2. In this folder, run: `npm run restore -- "full\path\to\aspi-rash-....db"`
   The current data is kept aside as `data\before-restore-<time>.db` first.
3. Start Aspi Rash again.

## Where things are
- Database: `data\aspi-rash.db` (never edit it by hand)
- Backups: the folder set on the Backups page (default `backups\`)
- Logs: `data\server.log`, `data\server-error.log`

## For changes to the code
- `npm run dev`: development server at http://127.0.0.1:3210 (stop the normal app first)
- After changing code, run `npm run build`, then restart the app with Stop and then Start.
- Stack: Next.js 16, React 19, Tailwind 4, SQLite through Node's built-in `node:sqlite`.
