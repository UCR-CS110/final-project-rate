import { useEffect, useState } from 'react';
import { API_URL } from '../api.js';

export default function Search() {
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [course, setCourse] = useState('');
  const [professors, setProfessors] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  function openProfessor(professorId) {
    window.location.href = `/professors/${professorId}`;
  }

  useEffect(() => {
    const trimmedSearch = search.trim();
    const trimmedDepartment = department.trim();
    const trimmedCourse = course.trim();

    if (!trimmedSearch && !trimmedDepartment && !trimmedCourse) {
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
        const params = new URLSearchParams();
        if (trimmedSearch) {
          params.set('search', trimmedSearch);
        }
        if (trimmedDepartment) {
          params.set('department', trimmedDepartment);
        }
        if (trimmedCourse) {
          params.set('course', trimmedCourse);
        }

        const response = await fetch(
          `${API_URL}/professors?${params.toString()}`,
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
  }, [search, department, course]);

  return (
    <div className="container search-page">
      <h1>Search Professors</h1>
      <div className="search-filters">
        <label>
          Name, department, title, or course
          <input
            autoFocus
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Try CS, MATH, Smith, or CS010"
          />
        </label>
        <label>
          Department
          <input
            value={department}
            onChange={(event) => setDepartment(event.target.value)}
            placeholder="Department"
          />
        </label>
        <label>
          Course code
          <input
            value={course}
            onChange={(event) => setCourse(event.target.value)}
            placeholder="Course"
          />
        </label>
      </div>

      {isLoading && <p className="search-status">Searching...</p>}
      {error && <p className="form-error">{error}</p>}
      {!isLoading && (search.trim() || department.trim() || course.trim()) && !error && professors.length === 0 && (
        <p className="search-status">No professors found.</p>
      )}

      <ul className="professor-results">
        {professors.map((professor) => (
          <li key={professor._id}>
            <button type="button" onClick={() => openProfessor(professor._id)}>
              <strong>{professor.name}</strong>
              <span>{professor.department || professor.organization || 'UCR'}</span>
              {professor.title && <span>{professor.title}</span>}
              {professor.courses?.length > 0 && <span>{professor.courses.slice(0, 4).join(', ')}</span>}
              {professor.stats?.averageRating && <span>{professor.stats.averageRating} / 5</span>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
