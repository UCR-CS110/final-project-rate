import { useEffect, useState } from 'react';
import { API_URL } from '../api.js';

export default function Search() {
  const [search, setSearch] = useState('');
  const [professors, setProfessors] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  function openProfessor(professorId) {
    window.location.href = `/professors/${professorId}`;
  }

  useEffect(() => {
    const trimmedSearch = search.trim();
    if (!trimmedSearch) {
      setProfessors([]);
      setError('');
      setIsLoading(false);
      return undefined;
    }

    const controller = new AbortController();

    async function searchProfessors() {
      setIsLoading(true);
      setError('');

      try {
        const response = await fetch(
          `${API_URL}/professors?search=${encodeURIComponent(trimmedSearch)}`,
          { signal: controller.signal }
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Professor search failed');
        }

        setProfessors(data);
      } catch (requestError) {
        if (requestError.name !== 'AbortError') {
          setProfessors([]);
          setError(requestError.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    searchProfessors();
    return () => controller.abort();
  }, [search]);

  return (
    <div className="container search-page">
      <h1>Search Professors</h1>
      <label>
        Professor name
        <input
          autoFocus
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Start typing a professor's name"
        />
      </label>

      {isLoading && <p className="search-status">Searching...</p>}
      {error && <p className="form-error">{error}</p>}
      {!isLoading && search.trim() && !error && professors.length === 0 && (
        <p className="search-status">No professors found.</p>
      )}

      <ul className="professor-results">
        {professors.map((professor) => (
          <li key={professor._id}>
            <button type="button" onClick={() => openProfessor(professor._id)}>
              <strong>{professor.name}</strong>
              <span>{professor.department || professor.organization || 'UCR'}</span>
              {professor.title && <span>{professor.title}</span>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
