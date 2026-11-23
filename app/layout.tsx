import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { backupAgeDays, backupStatus } from "@/lib/backup";
import "./globals.css";

export const dynamic = "force-dynamic";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Aspi Rash",
  description: "Import and export manager",
};

function BackupWarning() {
  const status = backupStatus();
  const age = backupAgeDays();
  let msg: string | null = null;
  if (status.lastError) msg = `Last backup failed. ${status.lastError}`;
  else if (age === null) msg = "No backup has been made yet.";
  else if (age > 2) msg = `The last backup is ${Math.floor(age)} days old.`;
  if (!msg) return null;
  return (
    <div className="border-b border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
        <span>⚠ {msg}</span>
        <Link href="/backups" className="font-medium underline">
          Go to backups
        </Link>
      </div>
    </div>
  );
}

const NAV = [
  { href: "/shipments", label: "Shipments" },
  { href: "/shipments/new", label: "New shipment" },
  { href: "/archive", label: "Archive" },
  { href: "/backups", label: "Backups" },
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <header className="border-b border-zinc-200 bg-white">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
            <Link href="/shipments" className="text-lg font-semibold tracking-tight text-blue-800">
              Aspi Rash
            </Link>
            <nav className="flex flex-wrap gap-1 text-sm">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="rounded-md px-2.5 py-1.5 text-zinc-700 hover:bg-zinc-100">
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <BackupWarning />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
