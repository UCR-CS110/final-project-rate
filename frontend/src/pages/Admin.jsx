import { useEffect, useState } from 'react';
import { API_URL } from '../api.js';

export default function Admin() {
  const [user, setUser] = useState(null);
  const [flaggedReviews, setFlaggedReviews] = useState([]);
  const [claimRequests, setClaimRequests] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  async function loadModerationQueue() {
    setError('');
    setIsLoading(true);

    try {
      const meResponse = await fetch(`${API_URL}/me`, { credentials: 'include' });
      if (!meResponse.ok) {
        window.location.href = '/login';
        return;
      }

      const meData = await meResponse.json();
      setUser(meData.user);

      const queueResponse = await fetch(`${API_URL}/admin/moderation`, {
        credentials: 'include',
      });
      const queueData = await queueResponse.json();

      if (!queueResponse.ok) {
        throw new Error(queueData.message || 'Could not load moderation queue');
      }

      setFlaggedReviews(queueData.flaggedReviews);
      setClaimRequests(queueData.claimRequests);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadModerationQueue();
  }, []);

  async function updateReviewStatus(reviewId, status) {
    setError('');
    const response = await fetch(`${API_URL}/admin/reviews/${reviewId}/status`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status,
        reason: status === 'deleted' ? 'Removed by admin' : '',
      }),
    });
    const data = await response.json();

    if (!response.ok) {
      setError(data.message || 'Could not update review');
      return;
    }

    await loadModerationQueue();
  }

  async function updateClaimStatus(professorId, status) {
    setError('');
    const response = await fetch(`${API_URL}/admin/professors/${professorId}/claim`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const data = await response.json();

    if (!response.ok) {
      setError(data.message || 'Could not update claim request');
      return;
    }

    await loadModerationQueue();
  }

  if (isLoading) {
    return <div className="container">Loading admin dashboard...</div>;
  }

  if (user?.role !== 'admin') {
    return (
      <div className="container">
        <h1>Admin Dashboard</h1>
        <p className="form-error">{error || 'You need an admin account to view this page.'}</p>
      </div>
    );
  }

  return (
    <div className="container admin-page">
      <h1>Admin Dashboard</h1>
      {error && <p className="form-error">{error}</p>}

      <section className="admin-panel">
        <h2>Flagged Reviews</h2>
        {flaggedReviews.length === 0 && <p>No flagged reviews.</p>}
        {flaggedReviews.map((review) => (
          <article className="admin-item" key={review._id}>
            <div>
              <strong>{review.username}</strong>
              <span>{review.rating} / 5</span>
            </div>
            <p>{review.text}</p>
            <p>Reason: {review.moderationReason || 'No reason provided'}</p>
            <div className="admin-actions">
              <button type="button" onClick={() => updateReviewStatus(review._id, 'active')}>
                Keep Review
              </button>
              <button type="button" onClick={() => updateReviewStatus(review._id, 'deleted')}>
                Delete Review
              </button>
            </div>
          </article>
        ))}
      </section>

      <section className="admin-panel">
        <h2>Professor Claim Requests</h2>
        {claimRequests.length === 0 && <p>No pending claim requests.</p>}
        {claimRequests.map((professor) => (
          <article className="admin-item" key={professor._id}>
            <div>
              <strong>{professor.name}</strong>
              <span>{professor.department || professor.organization || 'UCR'}</span>
            </div>
            <p>Requested by: {professor.requestedBy?.username || 'Unknown user'}</p>
            {professor.claimNote && <p>Note: {professor.claimNote}</p>}
            <div className="admin-actions">
              <button type="button" onClick={() => updateClaimStatus(professor._id, 'approved')}>
                Approve Claim
              </button>
              <button type="button" onClick={() => updateClaimStatus(professor._id, 'rejected')}>
                Reject Claim
              </button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
