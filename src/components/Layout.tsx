// src/components/Layout.tsx
import React, { ReactNode } from 'react';
import Link from 'next/link';
import Head from 'next/head'; // For setting page titles, meta tags per page if needed
import { useAuth } from '../context/AuthContext'; // Adjust path as necessary

interface LayoutProps {
  children: ReactNode;
  pageTitle?: string; // Optional: for setting unique page titles
}

export default function Layout({ children, pageTitle = "VolunteerConnect" }: LayoutProps) {
  const { user, logout } = useAuth();

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        {/* You can add other common meta tags here */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
         {/* Fonts are already in _app.tsx, so no need to repeat here unless for specific overrides */}
      </Head>

      <div className="app-container" style={{ fontFamily: 'Kalam, cursive, sans-serif', backgroundColor: '#fffbef', color: '#4a4a4a', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <header style={{ padding: '20px 0', borderBottom: '1px solid #fbc02d', backgroundColor: '#fffde7', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1100px', margin: '0 auto', padding: '0 20px' }}>
            <Link href="/" style={{ textDecoration: 'none' }}>
              <h1 style={{ margin: 0, fontSize: '2.2em', color: '#c79100', fontFamily: 'Patrick Hand, cursive' }}>
                VolunteerConnect
              </h1>
            </Link>
            <div style={{ fontFamily: 'Kalam, cursive', fontSize: '1.1em' }}>
              <Link href="/events" style={{ marginRight: '20px', color: '#5d4037', textDecoration: 'none', fontWeight: 'bold' }}>
                Events
              </Link>
              {user ? (
                <>
                  <Link href="/create-event" style={{ marginRight: '20px', color: '#5d4037', textDecoration: 'none', fontWeight: 'bold' }}>
                    Create Event
                  </Link>
                  <Link href="/my-created-events" style={{ marginRight: '20px', color: '#5d4037', textDecoration: 'none', fontWeight: 'bold' }}>
                    My Created Events
                  </Link>
                  <Link href="/my-events" style={{ marginRight: '20px', color: '#5d4037', textDecoration: 'none', fontWeight: 'bold' }}>
                    My Signups
                  </Link>
                  <button 
                    onClick={logout} 
                    className="button-link" // Use the class from globals.css
                    style={{ backgroundColor: 'transparent', border: 'none', color: '#c79100', fontWeight: 'bold', cursor: 'pointer', fontSize: '1em' }}
                  >
                    Logout ({user.fullName || user.email})
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" style={{ marginRight: '20px', color: '#5d4037', textDecoration: 'none', fontWeight: 'bold' }}>
                    Login
                  </Link>
                  <Link href="/signup" style={{ color: '#5d4037', textDecoration: 'none', fontWeight: 'bold' }}>
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </nav>
        </header>

        <main className="page-content" style={{ flexGrow: 1, width: '100%', maxWidth: '1100px', margin: '0 auto', padding: '30px 20px' }}>
          {children} {/* This is where the content of each page will go */}
        </main>

        <footer style={{ textAlign: 'center', marginTop: 'auto', paddingTop: '30px', paddingBottom: '30px', borderTop: '1px solid #fbc02d', color: '#777', fontSize: '0.95em', backgroundColor: '#fffde7' }}>
          <p>&copy; {new Date().getFullYear()} VolunteerConnect Stowe, PA. Making a difference, together.</p>
          <p style={{ fontSize: '0.8em', marginTop: '5px' }}>Inspired by yellow sticky notes and community spirit!</p>
        </footer>
      </div>
    </>
  );
}