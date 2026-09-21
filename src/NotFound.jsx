function NotFound() {
  const goHome = () => {
    window.location.assign("/");
  };

  return (
    <main className="not-found">
      <div className="not-found-card">
        <span className="not-found-code">404</span>
        <div className="not-found-icon">🎧</div>
        <p className="not-found-label">SONICFLOW</p>
        <h1>Page not found</h1>
        <p>
          This track seems to have gone off the playlist. The page you
          requested does not exist.
        </p>
        <button type="button" onClick={goHome}>
          ← Back to SonicFlow
        </button>
      </div>
    </main>
  );
}

export default NotFound;
