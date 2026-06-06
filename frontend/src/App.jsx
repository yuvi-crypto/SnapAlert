import React from 'react';
import { SnapAlertProvider } from './context/SnapAlertContext';
import SnapAlertApp from './pages/SnapAlertApp';
import './index.css';
import './App.css';

export default function App() {
  return (
    <SnapAlertProvider>
      <SnapAlertApp />
    </SnapAlertProvider>
  );
}
