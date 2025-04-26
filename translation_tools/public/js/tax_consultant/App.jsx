import * as React from 'react';
import { ChatContainer } from './components/ChatContainer';
import { TaxContextProvider } from './context/TaxContext';

export function App() {
  return (
    <TaxContextProvider>
      <main className="">
        <div className="tax-consultant-container">
          <h3 className="">AI Thai Tax Consultant</h3>
          <ChatContainer />
        </div>
      </main>
    </TaxContextProvider>
  );
}
