import { useState } from 'react';

export default function Login() {
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function login(event) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    const form = new FormData(event.currentTarget);

    try {
      const response = await fetch('http://localhost:8080/login', {
        method: 'POST',
        credentials: 'include',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          username: form.get('username'),
          password: form.get('password')
        }),
      });

      const data = await response.json();

      if (data.success) {
        window.location.href = '/search';
      } else {
        setError(data.message || 'Login failed');
      }
    } catch {
      setError('Could not connect to the server');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="container">
        <h1>Login</h1>
        <form onSubmit={login}>
            <input name="username" placeholder="Username" />
            <input name="password" type="password" placeholder="Password"/>
            <button disabled={isSubmitting}>
              {isSubmitting ? 'Logging in...' : 'Login'}
            </button>
      </form>
      { error && <p className="form-error">{error}</p> }
      <br />

      <a href="/signup">   Signup </a>
    </div>
  );
}
