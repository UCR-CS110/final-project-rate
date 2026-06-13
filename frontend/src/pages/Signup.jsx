import { useState } from 'react';
import { API_URL } from '../api.js';

export default function Signup() {
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function signup(event) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    const form = new FormData(event.currentTarget);

    try {
      const response = await fetch(`${API_URL}/signup`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: form.get('username'),
          password: form.get('password')
        }),
      });
      const data = await response.json();

      if (data.success) {
        window.location.href = '/search';
      } else {
        setError(data.message || 'Signup failed');
      }
    } catch {
      setError('Could not connect to the server');
    } finally {
      setIsSubmitting(false);
    }

  }

  return (
    <div>
      <div className="container">
      <h1>Signup</h1>
      <form onSubmit={signup}>
        <input name="username" placeholder="Username"/>
        <input name="password" type="password" placeholder="Password" />
        <button disabled={isSubmitting}>
          {isSubmitting ? 'Signing up...' : 'Signup'}
        </button>
      </form>
      {error && <p className="form-error">{error}</p>}
      </div>
    </div>
  );
}
