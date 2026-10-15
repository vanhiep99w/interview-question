import { useState } from 'react';
import { sum } from './math';

export default function App() {
  const [message, setMessage] = useState<string | null>(null);

  // #region lazy-import
  async function openAdmin() {
    const { getAdminMessage } = await import('./admin');
    setMessage(getAdminMessage());
  }
  // #endregion lazy-import

  return (
    <main>
      <h1>Frontend build lab</h1>
      <p>Kết quả: {sum(2, 3)}</p>
      <button onClick={openAdmin}>Tải admin module</button>
      {message && <p role="status">{message}</p>}
    </main>
  );
}
