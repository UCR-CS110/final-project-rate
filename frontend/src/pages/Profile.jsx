import { useEffect, useState } from 'react';
import { API_URL } from '../api.js';

function getUserIdFromPath() {
  return window.location.pathname.startsWith('/users/')
    ? decodeURIComponent(window.location.pathname.split('/').pop())
    : null;
}

function getInitial(username) {
  return username?.trim().charAt(0).toUpperCase() || '?';
}

async function readJson(response) {
  const contentType = response.headers.get('content-type') || '';

  if (!contentType.includes('application/json')) {
    throw new Error('Profile API is not available. Restart the backend and try again.');
  }

  return response.json();
}

export default function Profile() {
  const profileUserId = getUserIdFromPath();
  const [user, setUser] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      try {
        if (profileUserId) {
          const response = await fetch(`${API_URL}/users/${profileUserId}/profile`, {
            credentials: 'include',
          });
          const data = await readJson(response);

          if (!response.ok) {
            throw new Error(data.message || 'Could not load profile');
          }

          setUser(data.user);
          setReviews(data.reviews);
        } else {
          const [meResponse, reviewsResponse] = await Promise.all([
            fetch(`${API_URL}/me`, { credentials: 'include' }),
            fetch(`${API_URL}/my-reviews`, { credentials: 'include' }),
          ]);

          if (!meResponse.ok) {
            window.location.href = '/login';
            return;
          }

          const meData = await readJson(meResponse);
          const reviewsData = await readJson(reviewsResponse);

          if (!reviewsResponse.ok) {
            throw new Error(reviewsData.message || 'Could not load your reviews');
          }

          setUser(meData.user);
          setReviews(reviewsData);
        }
      } catch (requestError) {
        setError(requestError.message);
      } finally {
        setIsLoading(false);
      }
    }

    loadProfile();
  }, [profileUserId]);

  if (isLoading) {
    return <div className="profile-page">Loading profile...</div>;
  }

  return (
    <div className="profile-page">
      <section className="profile-card">
        {user && (
          <>
            <div className="profile-heading">
              <span className="profile-avatar">{getInitial(user.username)}</span>
              <h1>{profileUserId ? `${user.username}'s Profile` : 'Your Profile'}</h1>
            </div>
            <p><strong>Username:</strong> {user.username}</p>
            <p><strong>Role:</strong> {user.role}</p>
          </>
        )}
      </section>

      <section className="profile-reviews">
        <h2>{profileUserId ? `${user?.username || 'User'}'s Reviews` : 'Your Reviews'}</h2>
        {error && <p className="form-error">{error}</p>}
        {reviews.length === 0 && (
          <p>
            {profileUserId
              ? `${user?.username || 'This user'} has not left any reviews yet.`
              : 'You have not left any reviews yet.'}
          </p>
        )}

        {reviews.map((review) => (
          <article className="profile-review-card" key={review._id}>
            <div>
              <a href={`/professors/${review.professorId}`}>
                {review.professor?.name || 'Unknown professor'}
              </a>
              <span>{review.rating} / 5 stars</span>
            </div>
            <p>{review.text}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
