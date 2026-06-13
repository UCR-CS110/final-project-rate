import { useCallback, useEffect, useState } from 'react';
import { API_URL } from '../api.js';

const RATING_FIELDS = [
  ['difficulty', 'Difficulty'],
  ['quality', 'Quality'],
  ['engagement', 'Engagement'],
];

const TAG_OPTIONS = [
  'Tough Grader',
  'Amazing Lectures',
  'Clear Feedback',
  'Heavy Workload',
  'Helpful',
  'Engaging',
];

function getProfessorId() {
  return decodeURIComponent(window.location.pathname.split('/').pop());
}

function getInitial(username) {
  return username?.trim().charAt(0).toUpperCase() || '?';
}

function formatRating(value) {
  return value ? `${Number(value).toFixed(1)} / 5` : 'No ratings yet';
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
  const [similarProfessors, setSimilarProfessors] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [reviewText, setReviewText] = useState('');
  const [ratings, setRatings] = useState({
    difficulty: '3',
    quality: '5',
    engagement: '5',
  });
  const [selectedTags, setSelectedTags] = useState([]);
  const [replyTextByReview, setReplyTextByReview] = useState({});
  const [claimNote, setClaimNote] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadProfessorPage = useCallback(async function loadProfessorPage() {
    setError('');
    setIsLoading(true);

    try {
      const [professorResponse, reviewsResponse, similarResponse, meResponse] = await Promise.all([
        fetch(`${API_URL}/professors/${professorId}`),
        fetch(`${API_URL}/reviews?professorId=${professorId}`, {
          credentials: 'include',
        }),
        fetch(`${API_URL}/professors/${professorId}/similar`),
        fetch(`${API_URL}/me`, {
          credentials: 'include',
        }),
      ]);

      const professorData = await professorResponse.json();
      const reviewsData = await reviewsResponse.json();
      const similarData = await similarResponse.json();

      if (!professorResponse.ok) {
        throw new Error(professorData.message || 'Professor not found');
      }

      if (!reviewsResponse.ok) {
        throw new Error(reviewsData.message || 'Could not load reviews');
      }

      setProfessor(professorData);
      setReviews(reviewsData);
      setSimilarProfessors(similarResponse.ok ? similarData : []);

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
  }, [professorId]);

  useEffect(() => {
    loadProfessorPage();
  }, [loadProfessorPage]);

  function updateRating(name, value) {
    setRatings((currentRatings) => ({
      ...currentRatings,
      [name]: value,
    }));
  }

  function toggleTag(tag) {
    setSelectedTags((tags) => (
      tags.includes(tag)
        ? tags.filter((item) => item !== tag)
        : [...tags, tag].slice(0, 5)
    ));
  }

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
        difficulty: Number(ratings.difficulty),
        quality: Number(ratings.quality),
        engagement: Number(ratings.engagement),
        tags: selectedTags,
      }),
    });
    const data = await response.json();

    if (!response.ok) {
      setError(data.message || 'Could not add review');
      return;
    }

    setReviewText('');
    setRatings({ difficulty: '3', quality: '5', engagement: '5' });
    setSelectedTags([]);
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

  async function voteOnReview(review, vote) {
    setError('');
    const nextVote = review.userVote === vote ? 'none' : vote;
    const response = await fetch(`${API_URL}/reviews/${review._id}/vote`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vote: nextVote }),
    });
    const data = await response.json();

    if (!response.ok) {
      setError(data.message || 'Could not vote on review');
      return;
    }

    setReviews((items) => items.map((item) => (item._id === data._id ? data : item)));
  }

  async function flagReview(reviewId) {
    setError('');
    const response = await fetch(`${API_URL}/reviews/${reviewId}/flag`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Flagged from professor page' }),
    });
    const data = await response.json();

    if (!response.ok) {
      setError(data.message || 'Could not flag review');
      return;
    }

    setReviews((items) => items.map((item) => (item._id === data._id ? data : item)));
  }

  async function requestClaim(event) {
    event.preventDefault();
    setError('');

    const response = await fetch(`${API_URL}/professors/${professorId}/claim`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note: claimNote }),
    });
    const data = await response.json();

    if (!response.ok) {
      setError(data.message || 'Could not request profile claim');
      return;
    }

    setProfessor(data);
    setClaimNote('');
  }

  if (isLoading) {
    return <div className="professor-page">Loading professor...</div>;
  }

  if (error && !professor) {
    return <div className="professor-page"><p className="form-error">{error}</p></div>;
  }

  const stats = professor.stats || {};

  return (
    <div className="professor-page">
      <section className="professor-summary">
        <div className="professor-info">
          <a href="/search" className="back-link">Back to search</a>
          <h1>{professor.name}</h1>
          <p>{professor.title}</p>
          <p>{professor.department || professor.organization}</p>
          {professor.courses?.length > 0 && (
            <p>Courses: {professor.courses.join(', ')}</p>
          )}
          {professor.profileUrl && (
            <a href={professor.profileUrl} target="_blank" rel="noreferrer">
              View UCR profile
            </a>
          )}

          {currentUser && professor.claimStatus !== 'approved' && (
            <form className="claim-form" onSubmit={requestClaim}>
              <input
                value={claimNote}
                onChange={(event) => setClaimNote(event.target.value)}
                placeholder="Claim note or UCR email"
              />
              <button type="submit">
                {professor.claimStatus === 'pending' ? 'Update Claim Request' : 'Claim Profile'}
              </button>
            </form>
          )}
          {professor.claimStatus === 'approved' && <p>Claimed professor profile</p>}
          {professor.claimStatus === 'pending' && <p>Claim request pending admin review.</p>}
        </div>

        <div className="rating-card">
          <h2>{formatRating(stats.averageRating)}</h2>
          <p>{stats.reviewCount || 0} review{stats.reviewCount === 1 ? '' : 's'}</p>
          <div className="metric-grid">
            <span>Difficulty: {formatRating(stats.averageDifficulty)}</span>
            <span>Quality: {formatRating(stats.averageQuality)}</span>
            <span>Engagement: {formatRating(stats.averageEngagement)}</span>
          </div>
          {stats.topTags?.length > 0 && (
            <div className="tag-list">
              {stats.topTags.map(({ tag, count }) => (
                <span key={tag}>{tag} ({count})</span>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="reviews-section">
        <div className="reviews-header">
          <h2>Reviews</h2>
          {!currentUser && (
            <p>
              <a href="/signup">Sign up</a> or <a href="/login">log in</a> to leave a review, vote, or reply.
            </p>
          )}
        </div>

        {error && <p className="form-error">{error}</p>}

        {currentUser && (
          <form className="review-form" onSubmit={submitReview}>
            <div className="rating-input-grid">
              {RATING_FIELDS.map(([name, label]) => (
                <label key={name}>
                  {label}
                  <select value={ratings[name]} onChange={(event) => updateRating(name, event.target.value)}>
                    <option value="5">5</option>
                    <option value="4">4</option>
                    <option value="3">3</option>
                    <option value="2">2</option>
                    <option value="1">1</option>
                  </select>
                </label>
              ))}
            </div>
            <div className="tag-picker">
              {TAG_OPTIONS.map((tag) => (
                <button
                  className={selectedTags.includes(tag) ? 'selected' : ''}
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
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
                <span>{formatRating(review.rating)}</span>
              </div>
              <div className="metric-grid compact">
                <span>Difficulty {review.difficulty}</span>
                <span>Quality {review.quality}</span>
                <span>Engagement {review.engagement}</span>
              </div>
              {review.tags?.length > 0 && (
                <div className="tag-list">
                  {review.tags.map((tag) => <span key={tag}>{tag}</span>)}
                </div>
              )}
              <p>{review.text}</p>

              <div className="review-actions">
                <button
                  className={review.userVote === 'up' ? 'selected' : ''}
                  disabled={!currentUser}
                  type="button"
                  onClick={() => voteOnReview(review, 'up')}
                >
                  Upvote {review.upvoteCount}
                </button>
                <button
                  className={review.userVote === 'down' ? 'selected' : ''}
                  disabled={!currentUser}
                  type="button"
                  onClick={() => voteOnReview(review, 'down')}
                >
                  Downvote {review.downvoteCount}
                </button>
                <span>Helpful score: {review.helpfulScore}</span>
                {currentUser && (
                  <button type="button" onClick={() => flagReview(review._id)}>
                    Flag
                  </button>
                )}
              </div>

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

      {similarProfessors.length > 0 && (
        <section className="reviews-section">
          <h2>Similar Professors</h2>
          <ul className="professor-results">
            {similarProfessors.map((item) => (
              <li key={item._id}>
                <button type="button" onClick={() => { window.location.href = `/professors/${item._id}`; }}>
                  <strong>{item.name}</strong>
                  <span>{item.department || item.organization || 'UCR'}</span>
                  <span>{formatRating(item.stats?.averageRating)}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
