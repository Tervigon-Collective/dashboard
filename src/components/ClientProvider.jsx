"use client";
import { TimeframeDataProvider } from "@/helper/TimeframeDataContext";
import { UserProvider } from "@/helper/UserContext";

export default function ClientProvider({ children }) {
  return (
    <UserProvider>
      <TimeframeDataProvider>{children}</TimeframeDataProvider>
    </UserProvider>
  );
} 