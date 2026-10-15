import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './shell/App';
import './styles.css';

const element = document.getElementById('root');
if (!element) throw new Error('Missing #root in shell HTML');

createRoot(element).render(<BrowserRouter><App /></BrowserRouter>);
