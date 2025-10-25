import Intro from './pages/Intro';
import { Fallback } from './pages/Fallback';
import { APITest } from './pages/APITest';
import { Home } from './pages/Home';

function App() {
  const path = window.location.pathname;

  if (path === '/fallback') return <Fallback />;
  if (path === '/api-test') return <APITest />;
  if (path === '/home') return <Home />;

  // Default route → immersive landing page
  return <Intro />;
}

export default App;