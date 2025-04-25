import * as React from 'react';
// import '../../css/tailwind.css';
import './globals.css';
import { Button } from '@/components/ui/button';

export function App() {
  return (
    <main className="tw">
      <div className="tw-m-4">
        <h3 className="tw-text-blue-500">Test Tailwindcss</h3>
        <h4>
          Start editing at translation_tools/public/js/translation_tools/App.jsx
        </h4>
        <div className="tw-flex tw-flex-col tw-items-center tw-justify-center">
          <Button className="tw-bg-red-100 tw-rounded-lg">Click me</Button>
          <button className="tw-bg-green-500 tw-rounded-lg">Click Me</button>
        </div>
      </div>
    </main>
  );
}
