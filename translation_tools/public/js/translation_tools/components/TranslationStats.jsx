import React from 'react';
import { formatPercentage } from '../utils/helpers';

export default function TranslationStats({ stats }) {
  return (
    <div className="translation-stats">
      <div className="stat-box">
        <div className="stat-value">{stats.total}</div>
        <div className="stat-label">Total</div>
      </div>

      <div className="stat-box">
        <div className="stat-value text-success">{stats.translated}</div>
        <div className="stat-label">Translated</div>
      </div>

      <div className="stat-box">
        <div className="stat-value text-warning">{stats.untranslated}</div>
        <div className="stat-label">Untranslated</div>
      </div>

      <div className="progress-container">
        <div className="progress-header">
          <span className="progress-label">Progress</span>
          <span className="progress-percentage">
            {formatPercentage(stats.percentage)}
          </span>
        </div>
        <div className="progress">
          <div
            className="progress-bar"
            style={{ width: `${stats.percentage}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
}
