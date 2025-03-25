'use client';

import React from 'react';
import { ThemeProvider } from '@/lib/ThemeContext';
import { ProjectSettingsProvider } from '@/lib/ProjectSettingsContext';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>
          <ProjectSettingsProvider>
            {children}
          </ProjectSettingsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
