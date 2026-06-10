import { useEffect, useState } from 'react';
import { API_URL } from './api.js';

export default function Navbar() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    async function loadUser() {
      try {
        const response = await fetch(`${API_URL}/me`, {
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        }
      } catch {
        setUser(null);
      }
    }

    loadUser();
  }, []);

  async function logout() {
    await fetch(`${API_URL}/logout`, {
      method: 'POST',
      credentials: 'include',
    });
    setUser(null);
    window.location.href = '/login';
  }

  return (
    <nav className="navbar">
      <a href="/" className="title">Rate</a>
      <a href="/search" className="search">Search Professors</a>
      <ul>
        <li>
          {user ? (
            <details className="profile-menu">
              <summary>Profile</summary>
              <div className="profile-dropdown">
                <a href="/profile">View Profile</a>
                <button type="button" onClick={logout}>Log out</button>
              </div>
            </details>
          ) : (
            <a href="/login" className="subTitle">Log In</a>
          )}
        </li>
        <li>
          <a href="/about" className="subTitle">About</a>
        </li>
        <li>
          <a href="/admin/" className="subTitle">Admin</a>
        </li>
      </ul>
    </nav>
  );
}
