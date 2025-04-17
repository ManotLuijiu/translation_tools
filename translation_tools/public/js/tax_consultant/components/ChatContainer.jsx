import React, { useState, useEffect, useRef } from 'react';
import { useTaxContext } from '../context/TaxContext';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { TaxCalculator } from './TaxCalculator';

export function ChatContainer() {
  const { messages, loading } = useTaxContext();
  const messagesEndRef = useRef(null);
  const [showCalculator, setShowCalculator] = useState(false);

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="tw-flex tw-h-[70vh] tw-flex-col tw-overflow-hidden tw-rounded-lg tw-border">
      <div className="tw-flex-1 tw-overflow-y-auto tw-bg-gray-50 tw-p-4">
        {messages.map((message, index) => (
          <ChatMessage key={index} message={message} />
        ))}

        {loading && (
          <div className="tw-flex tw-items-center tw-py-2 tw-text-gray-500">
            <div className="tw-flex tw-animate-pulse tw-space-x-2">
              <div className="tw-h-2 tw-w-2 tw-rounded-full tw-bg-gray-400"></div>
              <div className="tw-h-2 tw-w-2 tw-rounded-full tw-bg-gray-400"></div>
              <div className="tw-h-2 tw-w-2 tw-rounded-full tw-bg-gray-400"></div>
            </div>
            <span className="tw-ml-2">กำลังคิด...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="tw-border-t tw-bg-white tw-p-4">
        <div className="tw-mb-2 tw-flex">
          <button
            className={`tw-mr-2 tw-rounded-md tw-px-3 tw-py-1 tw-text-sm ${
              !showCalculator
                ? 'tw-bg-blue-500 tw-text-white'
                : 'tw-bg-gray-200 tw-text-gray-700'
            }`}
            onClick={() => setShowCalculator(false)}
          >
            ถามคำถาม
          </button>
          <button
            className={`tw-rounded-md tw-px-3 tw-py-1 tw-text-sm ${
              showCalculator
                ? 'tw-bg-blue-500 tw-text-white'
                : 'tw-bg-gray-200 tw-text-gray-700'
            }`}
            onClick={() => setShowCalculator(true)}
          >
            คำนวณภาษี
          </button>
        </div>

        {showCalculator ? <TaxCalculator /> : <ChatInput />}
      </div>
    </div>
  );
}
