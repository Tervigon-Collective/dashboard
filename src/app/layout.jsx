import PluginInit from "@/helper/PluginInit";
import "./font.css";
import "./globals.css";
import ClientProvider from "@/components/ClientProvider";
import AuthGuard from "@/components/AuthGuard";
import { UserProvider } from "@/helper/UserContext";

export const metadata = {
  title: "NEXT JS - Admin Dashboard Multipurpose Bootstrap 5 Template",
  description:
    "JS is a developer-friendly, ready-to-use admin template designed for building attractive, scalable, and high-performing web applications.",
  verification: {
    google: "8xh-wEGis0qqljGtYpLv2pKqJ7Ta8V5d5gC25LYSYXk",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang='en'>
      <PluginInit />
      <body suppressHydrationWarning={true}>
        <ClientProvider>
          <UserProvider>
            <AuthGuard>
              {children}
            </AuthGuard>
          </UserProvider>
        </ClientProvider>
      </body>
    </html>
  );
}
