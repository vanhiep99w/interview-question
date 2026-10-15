import { Link, Route, Routes } from 'react-router-dom';
import { VueHost } from './VueHost';

export function App() {
  return (
    <div className="shell">
      <header>
        <h1>React shell</h1>
        <nav aria-label="Shell navigation">
          <Link to="/">Home</Link>
          <Link to="/catalog">Catalog</Link>
        </nav>
      </header>
      <Routes>
        <Route path="/" element={<main><h2>Shell home</h2><p>Vue is not loaded until you open Catalog.</p></main>} />
        <Route path="/catalog/*" element={<VueHost />} />
        <Route path="*" element={<p>Shell route not found.</p>} />
      </Routes>
    </div>
  );
}
