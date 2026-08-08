import { useState } from 'react';
import EntryHall from './EntryHall';
import MainLayout from './components/layout/MainLayout';
import './i18n';
import './shader/categories'; // Boot: registers all shader metadata

export default function App() {
  const [entered, setEntered] = useState(false);

  if (!entered) {
    return <EntryHall onEnter={() => setEntered(true)} />;
  }

  return <MainLayout />;
}
