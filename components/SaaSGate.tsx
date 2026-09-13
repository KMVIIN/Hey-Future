"use client";

// Future 4.1 supports a guest/free mode. Authentication is optional for basic local use.
// Signed-in users get cloud sync, account usage, billing and connected services.
export default function SaaSGate({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
