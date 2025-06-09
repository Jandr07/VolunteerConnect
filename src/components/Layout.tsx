import React, { useState, useEffect, ReactNode } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { useAuth } from '../context/AuthContext';

interface LayoutProps {
  children: ReactNode;
  pageTitle?: string;
}

export default function Layout({ children, pageTitle = "VolunteerConnect" }: LayoutProps) {
  const { user, logout } = useAuth();

  // State to manage header visibility
  const [isHeaderVisible, setHeaderVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const controlHeader = () => {
      // If user scrolls down, hide the header; if they scroll up, show it
      if (typeof window !== 'undefined') {
        if (window.scrollY > lastScrollY && window.scrollY > 100) { // Hide after scrolling 100px down
          setHeaderVisible(false);
        } else {
          setHeaderVisible(true);
        }
        // Remember the current scroll position for the next move
        setLastScrollY(window.scrollY);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', controlHeader);

      // Cleanup function to remove the event listener
      return () => {
        window.removeEventListener('scroll', controlHeader);
      };
    }
  }, [lastScrollY]);

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <div className="app-container">
        {/*
          Dynamically add the 'header-hidden' class based on state.
          The CSS will handle the smooth transition.
        */}
        <header className={`app-header ${!isHeaderVisible ? 'header-hidden' : ''}`}>
          <nav className="main-nav">
            <Link href="/">
              <h1 className="logo-title">VolunteerConnect</h1>
            </Link>

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
          <p>&copy; {new Date().getFullYear()} VolunteerConnect, Stowe, PA. Making a difference, together.</p>
          <p className="footer-inspiration">Inspired by yellow sticky notes and community spirit!</p>
        </footer>
      </div>
    </>
  );
}
