import type { Metadata } from "next";
import { Cormorant_Garamond, Work_Sans } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { SoutienFlottant } from "@/components/dons/SoutienFlottant";
import { donsVisibles } from "@/lib/dons-serveur";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const workSans = Work_Sans({
  variable: "--font-work-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Main à Main — savoir-faire manuels",
  description:
    "Plateforme de mise en relation entre transmetteurs de savoir-faire manuels et personnes qui veulent apprendre. Gratuite, sans commission.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${cormorant.variable} ${workSans.variable} antialiased`}
    >
      <body className="min-h-screen">
        {children}
        {/* L'invitation à donner, sur les pages publiques : elle se tait
            d'elle-même ailleurs, et tant que les dons ne sont pas ouverts. */}
        {donsVisibles() && <SoutienFlottant />}
        <Toaster />
      </body>
    </html>
  );
}
