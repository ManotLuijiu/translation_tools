import * as React from 'react';
import '../../css/tailwind.css';
import { ChatContainer } from './components/ChatContainer';
import { TaxContextProvider } from './context/TaxContext';

export function App() {
  return (
    <TaxContextProvider>
      <main className="tw">
        <div className="tax-consultant-container tw-p-4">
          <h3 className="tw-mb-4 tw-text-xl tw-font-medium tw-text-gray-900">
            AI Thai Tax Consultant
          </h3>
          <ChatContainer />
        </div>
      </main>
    </TaxContextProvider>
  );
}
