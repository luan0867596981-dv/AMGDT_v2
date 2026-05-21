// Updated: 2026-05-19 - Wrap app với ErrorBoundary để tránh trắng trang
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import UserPortal from './UserPortal';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <UserPortal />
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
