import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SidebarProvider } from "@/components/ui/sidebar";
import { SidebarTabs } from "@/components/sidebar-tabs";
import { ChatProvider } from "./chat-context";
import Image from "next/image";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    template: '%s | Eureka',
    default: 'DeepEureka - 创意工作流'
  },
  description: 'AI 驱动的创意解决方案平台'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="bg-background text-foreground h-screen flex flex-col">
        <header className="h-12 px-4 border-b flex items-center bg-card flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-foreground">DeepEureka</span>
            <span className="bg-gradient-to-r from-blue-600 to-purple-700 text-white text-[10px] font-medium px-2 py-0.5 rounded-md uppercase tracking-wider shadow-sm border border-blue-200/20">
              ALPHA
            </span>
          </div>
        </header>
        <div className="flex flex-1 min-h-0">
          <SidebarProvider>
            <ChatProvider>
              <SidebarTabs />
              <main className="flex-1 min-h-0 overflow-y-auto">
                {children}
              </main>
            </ChatProvider>
          </SidebarProvider>
        </div>
      </body>
    </html>
  );
}
