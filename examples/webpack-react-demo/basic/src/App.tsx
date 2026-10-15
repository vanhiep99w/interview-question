import { useState } from 'react';

export function App() {
  const [count, setCount] = useState<number>(0);

  return (
    <main className="card">
      <h1>React chạy qua Webpack</h1>
      <p>Bạn đã bấm {count} lần.</p>
      <button onClick={() => setCount((current) => current + 1)}>
        Tăng bộ đếm
      </button>
    </main>
  );
}
