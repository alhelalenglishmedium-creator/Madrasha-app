import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';

export const metadata: Metadata = {
  title: 'মাদ্রাসায়ে ইসলামিয়া দারুল উলুম, কোম্পানিগঞ্জ।',
  description: 'Role-Based Madrasa Management System',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="bn" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.maateen.me/kalpurush/font.css"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&display=swap"
        />
      </head>
      <body className="antialiased bg-[#f8fafc]">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}