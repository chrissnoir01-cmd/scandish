import { Fraunces, Geist, Poppins } from "next/font/google";

/** Marketing pages (homepage, About): a warm serif for headlines, a clean sans for text. Self-hosted by Next.js. */
export const displayFont = Fraunces({
  subsets: ["latin"],
  axes: ["opsz", "SOFT"],
  variable: "--font-display",
  display: "swap",
});

export const sansFont = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

/** The ScanDish wordmark, in the lettering of the logo (bold geometric sans). */
export const wordmarkFont = Poppins({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-wordmark",
  display: "swap",
});

/** Put on the page root so the fonts (and the .font-display / .font-wordmark classes) are available inside it. */
export const marketingFonts = `${displayFont.variable} ${sansFont.variable} ${wordmarkFont.variable}`;
