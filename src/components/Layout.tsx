import React, { useState, useEffect, ReactNode } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';

interface LayoutProps {
  children: ReactNode;
  pageTitle?: string;
}

export default function Layout({ children, pageTitle = "VolunteerConnect" }: LayoutProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [isHeaderVisible, setHeaderVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const controlHeader = () => {
      if (typeof window !== 'undefined') {
        if (window.scrollY > lastScrollY && window.scrollY > 100) {
          setHeaderVisible(false);
        } else {
          setHeaderVisible(true);
        }
        setLastScrollY(window.scrollY);
      }
    };
    window.addEventListener('scroll', controlHeader);
    return () => window.removeEventListener('scroll', controlHeader);
  }, [lastScrollY]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    router.push(`/search-groups?q=${encodeURIComponent(searchTerm.trim())}`);
  };

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      <div className="app-container">
        <header className={`app-header ${!isHeaderVisible ? 'header-hidden' : ''}`}>
          <nav className="main-nav">
            <Link href="/">
              <h1 className="logo-title">VolunteerConnect</h1>
            </Link>
            <div className="nav-links">
              <form onSubmit={handleSearchSubmit} className="nav-search-form">
                <input
                  type="text"
                  placeholder="Search for groups..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="nav-search-input"
                />
              </form>
              <Link href="/groups">Browse Groups</Link>
              <Link href="/events">Events</Link>
              {user ? (
                <>
                  <Link href="/my-groups">My Groups</Link>
                  <Link href="/create-group">Create Group</Link>
                  <Link href="/my-events">My Signups</Link>
                  <button onClick={logout} className="button-link">
                    Logout
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
