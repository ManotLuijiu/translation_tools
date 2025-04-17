import * as React from 'react';

export function ChatMessage({ message }) {
  const { role, content, timestamp, isError, metadata } = message;
  const isUser = role === 'user';

  // Format timestamp
  const formattedTime = new Intl.DateTimeFormat('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(timestamp);

  return (
    <div
      className={`tw-mb-4 tw-flex ${isUser ? 'tw-justify-end' : 'tw-justify-start'}`}
    >
      <div
        className={`tw-max-w-3/4 tw-rounded-lg tw-px-4 tw-py-2 ${
          isUser
            ? 'tw-rounded-br-none tw-bg-blue-500 tw-text-white'
            : isError
              ? 'tw-rounded-bl-none tw-bg-red-100 tw-text-red-800'
              : 'tw-rounded-bl-none tw-border tw-bg-white'
        }`}
      >
        <div className="tw-whitespace-pre-wrap">{content}</div>
        <div
          className={`tw-mt-1 tw-text-xs ${isUser ? 'tw-text-blue-200' : 'tw-text-gray-500'}`}
        >
          {formattedTime}
        </div>

        {metadata && metadata.chunks_used && (
          <div
            className="tw-mt-2 tw-cursor-help tw-text-xs tw-text-gray-500"
            title="Source information"
          >
            <details>
              <summary className="tw-cursor-pointer">
                แหล่งข้อมูล ({metadata.total_chunks})
              </summary>
              <ul className="tw-mt-1 tw-pl-4">
                {metadata.chunks_used.map((chunk, i) => (
                  <li key={i}>
                    {chunk.name}
                    {chunk.relevance &&
                      ` (${(chunk.relevance * 100).toFixed(1)}%)`}
                  </li>
                ))}
              </ul>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
