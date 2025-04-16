import * as React from 'react';
import '../../css/tailwind.css';
import { Button } from '@/components/ui/button';
import Dashboard from './components/Dashboard';

export function App() {
  return (
    <main className="tw">
      <div className="tw-flex tw-flex-col tw-items-center tw-justify-center">
        <Button>Click me</Button>
      </div>
    </main>
  );
}
