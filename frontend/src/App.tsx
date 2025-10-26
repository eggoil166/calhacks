import { Fallback } from './pages/Fallback';
import { APITest } from './pages/APITest';
import { Home } from './pages/Home';
import STLPlanePage from './pages/STLPlanePage';

function App() {
  const path = window.location.pathname;
  if (path === '/fallback') return <Fallback />;
  if (path === '/api-test') return <APITest />;
  if (path === '/stl-plane') return <STLPlanePage />;
  return <Home />;
}

export default App;
