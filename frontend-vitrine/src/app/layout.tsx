import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import "./globals.css";

import { CartProvider } from "../components/header/CartContext";
import { WishlistProvider } from "../components/header/WishlistContext";
import { CompareProvider } from "../components/header/CompareContext";

import "react-toastify/dist/ReactToastify.css";
import { ToastContainer } from "react-toastify";

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
    default: "Made in Yeumbeul Nord — les productions des groupements",
    template: "%s · Made in Yeumbeul Nord",
  },
  description:
    "Découvrez les cent groupements de Yeumbeul Nord et leurs productions : " +
    "saponification, cosmétiques, transformation agroalimentaire, céréales, " +
    "maraîchage, artisanat, couture, restauration. Une initiative de la Commune " +
    "de Yeumbeul Nord.",
  icons: {
    icon: "/assets/images/fav.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Locale résolue côté serveur depuis le cookie (src/i18n/request.ts).
  const locale = await getLocale();

  return (
    <html lang={locale}>
      <head>
        {/* 🚀 Load CSS from public folder */}
        <link rel="stylesheet" href="/assets/css/bootstrap.min.css" />
        <link rel="stylesheet" href="/assets/css/plugins.css" />
        <link rel="stylesheet" href="/assets/css/style.css" />
      </head>

      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {/* Les messages et la locale sont hérités de la configuration serveur :
            aucune prop à passer. Les trois contextes de la boutique sont montés
            ici et NULLE PART AILLEURS — le doublon de src/app/page.tsx est une
            dette connue (CLAUDE.md §5, front vitrine). */}
        <NextIntlClientProvider>
          <CompareProvider>
            <WishlistProvider>
              <CartProvider>
                {children}
                <ToastContainer position="top-right" autoClose={3000} />
              </CartProvider>
            </WishlistProvider>
          </CompareProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
