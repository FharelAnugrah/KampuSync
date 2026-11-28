import { Inter } from "next/font/google";
import "./globals.css";
const inter = Inter({
    variable: "--font-inter",
    subsets: ["latin"],
    display: "swap",
});
export const metadata = {
    title: {
        default: "Kampusync — Portal Akademik Terintegrasi",
        template: "%s | Kampusync",
    },
    description: "One Campus, Connected Academics. Sistem Informasi Manajemen Akademik Terintegrasi.",
};
export default function RootLayout({ children, }) {
    return (<html lang="id" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full bg-[#F6F8FB] text-[#172033]">{children}</body>
    </html>);
}
