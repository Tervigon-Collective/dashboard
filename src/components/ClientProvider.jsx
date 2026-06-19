"use client";
import { TimeframeDataProvider } from "@/helper/TimeframeDataContext";
import { UserProvider } from "@/helper/UserContext";
import QueryProvider from "@/providers/QueryProvider";

export default function ClientProvider({ children }) {
  return (
    <QueryProvider>
      <UserProvider>
        <TimeframeDataProvider>{children}</TimeframeDataProvider>
      </UserProvider>
    </QueryProvider>
  );
} 