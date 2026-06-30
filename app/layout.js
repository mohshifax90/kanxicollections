import { SpeedInsights } from "@vercel/speed-insights/next";
import { Poppins } from "next/font/google";
import { CartProvider } from "@/components/cart-provider";
import { StorefrontDataProvider } from "@/components/storefront-data-provider";
import { getStorefrontBootstrap } from "@/lib/storefront-data";
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

export default async function RootLayout({ children }) {
  const initialBootstrap = await getStorefrontBootstrap();

  return (
    <html lang="en" className={poppins.variable}>
      <body>
        <StorefrontDataProvider initialBootstrap={initialBootstrap}>
          <CartProvider>
            {children}
            <SpeedInsights />
          </CartProvider>
        </StorefrontDataProvider>
      </body>
    </html>
  );
}
