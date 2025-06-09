import React, { ReactNode } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { useAuth } from '../context/AuthContext';

interface LayoutProps {
  children: ReactNode;
  pageTitle?: string;
}

export default function Layout({ children, pageTitle = "VolunteerConnect" }: LayoutProps) {
  const { user, logout } = useAuth();

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <div className="app-container">
        <header className="app-header">
          <nav className="main-nav">
            <Link href="/">
              <h1 className="logo-title">VolunteerConnect</h1>
            </Link>

            {/* A single container for all navigation links */}
            <div className="nav-links">
              <Link href="/events">Events</Link>
              {user ? (
                <>
                  <Link href="/create-event">Create Event</Link>
                  <Link href="/my-created-events">My Created Events</Link>
                  <Link href="/my-events">My Signups</Link>
                  <button onClick={logout} className="button-link">
                    Logout ({user.fullName || user.email})
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login">Login</Link>
                  <Link href="/signup">Sign Up</Link>
                </>
              )}
            </div>
          </nav>
        </header>

        <main className="page-content">{children}</main>

        <footer className="app-footer">
          <p>&copy; {new Date().getFullYear()} VolunteerConnect Stowe, PA. Making a difference, together.</p>
          <p className="footer-inspiration">Inspired by yellow sticky notes and community spirit!</p>
        </footer>
      </div>
    </>
  );
}