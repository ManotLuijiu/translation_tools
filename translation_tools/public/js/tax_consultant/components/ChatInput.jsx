import React, { useState } from 'react';
import { useTaxContext } from '../context/TaxContext';

export function ChatInput() {
  const [message, setMessage] = useState('');
  const { sendQuestion, loading } = useTaxContext();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim() && !loading) {
      sendQuestion(message);
      setMessage('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="tw-flex">
      <input
        type="text"
        className="tw-flex-grow tw-rounded-l-md tw-border-gray-300"
        placeholder="พิมพ์คำถามเกี่ยวกับภาษีไทย..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        disabled={loading}
      />
      <button
        type="submit"
        className="tw-rounded-r-md tw-bg-blue-500 tw-px-4 tw-py-2 tw-text-white disabled:tw-bg-gray-300"
        disabled={!message.trim() || loading}
      >
        ส่ง
      </button>
    </form>
  );
}
