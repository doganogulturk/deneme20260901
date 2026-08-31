import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Plaka Peşinde",
  description: "Türkiye şehirleri ve plakaları için hızlı eşleştirme oyunu.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
