import { NavLink, Outlet } from "react-router-dom";
import { USE_MOCK_API } from "../../services/config";

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

      {USE_MOCK_API && (
        <div className="demo-banner" role="note">
          <div className="container">
            <strong>Demo mode.</strong> Questions, scores, delivery observations and suggestions are sample data
            generated in your browser. Your recording is sent only to the backend on this computer to be transcribed,
            and the transcript you review is used only for the experimental text emotion analysis.
          </div>
        </div>
      )}

      <main id="main" className="container app-main" tabIndex={-1}>
        <Outlet />
      </main>

      <footer className="app-footer">
        <div className="container">
          Practice tool for a Deep Learning course project. Delivery feedback describes observable cues such as pace
          and pauses. It does not measure confidence, emotion or job suitability.
        </div>
      </footer>
    </div>
  );
}
