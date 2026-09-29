import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { appConfig } from "@/config/app";
import { SessionProvider } from "@/lib/session-context";
import { AppNavigation } from "@/components/navigation/app-navigation";
import { ToastHost } from "@/components/ui/toast";
import { ServiceWorkerRegister } from "@/components/providers/service-worker-register";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const title = `${appConfig.name} — ${appConfig.tagline}`;

export const metadata: Metadata = {
  title,
  description: appConfig.description,
  applicationName: appConfig.name,
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  appleWebApp: {
    capable: true,
    title: appConfig.name,
    statusBarStyle: "default",
  },
  openGraph: {
    title,
    description: appConfig.description,
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#ff6b35",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <SessionProvider>
          <AppNavigation />
          <main className="mx-auto w-full flex-1 pb-24 pt-4 md:pb-10 md:pt-6">
            {children}
          </main>
          <ToastHost />
          <ServiceWorkerRegister />
        </SessionProvider>
      </body>
    </html>
  );
}