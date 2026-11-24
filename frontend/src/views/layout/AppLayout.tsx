import { NavLink, Outlet } from "react-router-dom";

export default function AppLayout() {
  return (
    <div className="app">
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      <header className="app-header">
        <div className="container app-header__inner">
          <NavLink to="/" className="brand" aria-label="Interview Practice Agent, home">
            <span className="brand__mark" aria-hidden="true">
              IP
            </span>
            <span className="brand__name">Interview Practice Agent</span>
          </NavLink>
          <nav aria-label="Main">
            <ul className="nav">
              <li>
                <NavLink to="/" end>
                  Home
                </NavLink>
              </li>
              <li>
                <NavLink to="/setup">Practice</NavLink>
              </li>
              <li>
                <NavLink to="/history">Previous sessions</NavLink>
              </li>
            </ul>
          </nav>
        </div>
      </header>

      <div className="demo-banner" role="note">
        <div className="container">
          <strong>Runs on this computer.</strong> Your recording is sent only to the local backend, where it is
          transcribed and its delivery (pace, pauses, filler words, volume) is measured. If you opted in to camera
          cues, a few camera frames are analysed there for approximate gaze direction and not kept. Answer-quality
          scoring is not available yet.
        </div>
      </div>

      <main id="main" className="container app-main" tabIndex={-1}>
        <Outlet />
      </main>

      <footer className="app-footer">
        <div className="container">
          Practice tool for a Deep Learning course project. Results describe what you said and how you delivered it;
          they do not measure knowledge, correctness, confidence, anxiety, passion or job suitability.
        </div>
      </footer>
    </div>
  );
}
