import { useEffect, useState } from 'react';
import { API_URL } from '../api.js';

function getProfessorId() {
  return decodeURIComponent(window.location.pathname.split('/').pop());
}

function getRatingCounts(reviews) {
  return [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: reviews.filter((review) => review.rating === rating).length,
  }));
}

function getAverageRating(reviews) {
  if (reviews.length === 0) {
    return 'No ratings yet';
  }

  const total = reviews.reduce((sum, review) => sum + review.rating, 0);
  return `${(total / reviews.length).toFixed(1)} / 5`;
}

function getInitial(username) {
  return username?.trim().charAt(0).toUpperCase() || '?';
}

function UserProfileLink({ userId, username }) {
  return (
    <a className="user-link" href={`/users/${userId}`}>
      <span className="user-avatar">{getInitial(username)}</span>
      <span>{username}</span>
    </a>
  );
}

export default function Professor() {
  const professorId = getProfessorId();
  const [professor, setProfessor] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [reviewText, setReviewText] = useState('');
  const [rating, setRating] = useState('5');
  const [replyTextByReview, setReplyTextByReview] = useState({});
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  async function loadProfessorPage() {
    setError('');
    setIsLoading(true);

    try {
      const [professorResponse, reviewsResponse, meResponse] = await Promise.all([
        fetch(`${API_URL}/professors/${professorId}`),
        fetch(`${API_URL}/reviews?professorId=${professorId}`, {
          credentials: 'include',
        }),
        fetch(`${API_URL}/me`, {
          credentials: 'include',
        }),
      ]);

      const professorData = await professorResponse.json();
      const reviewsData = await reviewsResponse.json();

      if (!professorResponse.ok) {
        throw new Error(professorData.message || 'Professor not found');
      }

      if (!reviewsResponse.ok) {
        throw new Error(reviewsData.message || 'Could not load reviews');
      }

      setProfessor(professorData);
      setReviews(reviewsData);

      if (meResponse.ok) {
        const meData = await meResponse.json();
        setCurrentUser(meData.user);
      } else {
        setCurrentUser(null);
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadProfessorPage();
  }, [professorId]);

  async function submitReview(event) {
    event.preventDefault();
    setError('');

    const response = await fetch(`${API_URL}/reviews`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        professorId,
        text: reviewText,
        rating: Number(rating),
      }),
    });
    const data = await response.json();

    if (!response.ok) {
      setError(data.message || 'Could not add review');
      return;
    }

    setReviewText('');
    setRating('5');
    await loadProfessorPage();
  }

  async function submitReply(event, reviewId) {
    event.preventDefault();
    setError('');

    const response = await fetch(`${API_URL}/reviews/${reviewId}/replies`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: replyTextByReview[reviewId],
      }),
    });
    const data = await response.json();

    if (!response.ok) {
      setError(data.message || 'Could not add reply');
      return;
    }

    setReplyTextByReview((replyText) => ({
      ...replyText,
      [reviewId]: '',
    }));
    await loadProfessorPage();
  }

  if (isLoading) {
    return <div className="professor-page">Loading professor...</div>;
  }

  if (error && !professor) {
    return <div className="professor-page"><p className="form-error">{error}</p></div>;
  }

  const ratingCounts = getRatingCounts(reviews);
  const maxCount = Math.max(...ratingCounts.map((item) => item.count), 1);

  return (
    <div className="professor-page">
      <section className="professor-summary">
        <div className="professor-info">
          <a href="/search" className="back-link">Back to search</a>
          <h1>{professor.name}</h1>
          <p>{professor.title}</p>
          <p>{professor.department || professor.organization}</p>
          {professor.profileUrl && (
            <a href={professor.profileUrl} target="_blank" rel="noreferrer">
              View UCR profile
            </a>
          )}
        </div>

        <div className="rating-card">
          <h2>{getAverageRating(reviews)}</h2>
          <p>{reviews.length} review{reviews.length === 1 ? '' : 's'}</p>
          <div className="rating-distribution">
            {ratingCounts.map(({ rating: ratingValue, count }) => (
              <div className="rating-row" key={ratingValue}>
                <span>{ratingValue} stars</span>
                <div className="rating-bar">
                  <div style={{ width: `${(count / maxCount) * 100}%` }} />
                </div>
                <span>{count}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="reviews-section">
        <div className="reviews-header">
          <h2>Reviews</h2>
          {!currentUser && (
            <p>
              <a href="/signup">Sign up</a> or <a href="/login">log in</a> to leave a review or reply.
            </p>
          )}
        </div>

        {error && <p className="form-error">{error}</p>}

        {currentUser && (
          <form className="review-form" onSubmit={submitReview}>
            <label>
              Rating
              <select value={rating} onChange={(event) => setRating(event.target.value)}>
                <option value="5">5 stars</option>
                <option value="4">4 stars</option>
                <option value="3">3 stars</option>
                <option value="2">2 stars</option>
                <option value="1">1 star</option>
              </select>
            </label>
            <label>
              Your review
              <textarea
                value={reviewText}
                onChange={(event) => setReviewText(event.target.value)}
                placeholder="Share your experience"
                required
              />
            </label>
            <button type="submit">Leave Review</button>
          </form>
        )}

        <div className="review-list">
          {reviews.length === 0 && <p>No reviews yet.</p>}
          {reviews.map((review) => (
            <article className="review-card" key={review._id}>
              <div className="review-meta">
                <UserProfileLink userId={review.authorId} username={review.username} />
                <span>{review.rating} / 5</span>
              </div>
              <p>{review.text}</p>

              <div className="reply-list">
                {review.replies.map((reply) => (
                  <div className="reply-card" key={reply._id}>
                    <UserProfileLink userId={reply.authorId} username={reply.username} />
                    <p>{reply.text}</p>
                  </div>
                ))}
              </div>

              {currentUser && (
                <form className="reply-form" onSubmit={(event) => submitReply(event, review._id)}>
                  <input
                    value={replyTextByReview[review._id] || ''}
                    onChange={(event) => setReplyTextByReview((replyText) => ({
                      ...replyText,
                      [review._id]: event.target.value,
                    }))}
                    placeholder="Write a reply"
                    required
                  />
                  <button type="submit">Reply</button>
                </form>
              )}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
