export default function Admin() {
  return (
    <div className="container">
      <h1>Admin Dashboard</h1>
      <p className="admin-status">Admin tools are ready for moderation features.</p>
      <div className="admin-actions">
        <button type="button">Review Reports</button>
        <button type="button">Manage Users</button>
        <button type="button">Import Professors</button>
      </div>
    </div>
  );
}
