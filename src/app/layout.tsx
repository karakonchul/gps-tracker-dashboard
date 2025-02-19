// src/app/layout.tsx
import './globals.css';
import Script from 'next/script';
import { ReactNode } from 'react';

export const metadata = {
  title: 'GPS Tracker Dashboard',
  description: 'Dynamic full-screen map background with live GPS tracking',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <Script
          src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`}
          strategy="beforeInteractive"
        />
      </head>
      <body className="w-full h-full relative">
        {/* Transparent header with a semi-transparent background behind the text */}
        <header className="absolute top-0 left-0 w-full p-4 z-20 flex justify-center">
          <div className="bg-black bg-opacity-50 px-4 py-2 rounded">
            <h1 className="text-3xl font-bold text-white text-center drop-shadow-lg">
              GPS Tracker Dashboard
            </h1>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
