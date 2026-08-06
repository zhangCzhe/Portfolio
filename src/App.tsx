import { useState } from 'react';
import EntryPage from './EntryPage';
import MainLayout from './components/layout/MainLayout';
import './i18n';
import './shader/categories'; // Boot: registers all shader metadata

export default function App() {
  const [entered, setEntered] = useState(false);

  if (!entered) {
    return <EntryPage onEnter={() => setEntered(true)} />;
  }

  return <MainLayout />;
}
