import { SpeedInsights } from "@vercel/speed-insights/next";
import { Poppins } from "next/font/google";
import { CartProvider } from "@/components/cart-provider";
import { StorefrontDataProvider } from "@/components/storefront-data-provider";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  variable: "--font-poppins",
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata = {
  title: "Kanxi Collection",
  description: "Kanxi Collection storefront rebuilt with Next.js.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={poppins.variable}>
      <body>
        <StorefrontDataProvider>
          <CartProvider>
            {children}
            {process.env.NODE_ENV === "production" ? <SpeedInsights /> : null}
          </CartProvider>
        </StorefrontDataProvider>
      </body>
    </html>
  );
}
