import { SpeedInsights } from "@vercel/speed-insights/next";
import { Inter, Poppins } from "next/font/google";
import { CartProvider } from "@/components/cart-provider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const poppins = Poppins({
  subsets: ["latin"],
  variable: "--font-poppins",
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata = {
  title: "Kanxi Collection",
  description: "Kanxi Collection storefront rebuilt with Next.js.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`}>
      <body>
        <CartProvider>
          {children}
          <SpeedInsights />
        </CartProvider>
      </body>
    </html>
  );
}
