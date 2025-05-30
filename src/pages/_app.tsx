// src/pages/_app.tsx
import type { AppProps } from 'next/app';
import Head from 'next/head';
import { AuthProvider } from '../context/AuthContext'; // Adjust path
import Layout from '../components/Layout';           // Import the Layout component
import '../styles/globals.css';
import type { NextComponentType, NextPageContext } from 'next'; // Import these


type ComponentWithPageTitle = NextComponentType<NextPageContext, any, any> & {
  pageTitle?: string;
};

interface MyAppProps extends AppProps {
  Component: ComponentWithPageTitle;
}

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      {/* Fonts are loaded once here for the whole app */}
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Kalam:wght@300;400;700&family=Patrick+Hand&display=swap" rel="stylesheet" />
      </Head>
      <Layout pageTitle={(Component as any).pageTitle || "VolunteerConnect"}> {/* Pass pageTitle if component defines it */}
        <Component {...pageProps} />
      </Layout>
    </AuthProvider>
  );
}

export default MyApp;