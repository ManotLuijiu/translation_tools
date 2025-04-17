import React, { useState } from 'react';
import { useTaxContext } from '../context/TaxContext';

export function TaxCalculator() {
  const [formData, setFormData] = useState({
    base_salary: '',
    expenses: '',
    exemption: '',
    ask_claude: false,
  });

  const { calculateTax, loading } = useTaxContext();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!loading) {
      calculateTax(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="tw-space-y-4">
      <div className="tw-grid tw-grid-cols-1 tw-gap-4 md:tw-grid-cols-3">
        <div>
          <label className="tw-mb-1 tw-block tw-text-sm tw-font-medium tw-text-gray-700">
            เงินได้ (บาท)
          </label>
          <input
            type="number"
            name="base_salary"
            value={formData.base_salary}
            onChange={handleChange}
            className="tw-w-full tw-rounded-md tw-border-gray-300"
            placeholder="500000"
            required
          />
        </div>

        <div>
          <label className="tw-mb-1 tw-block tw-text-sm tw-font-medium tw-text-gray-700">
            ค่าใช้จ่าย (บาท)
          </label>
          <input
            type="number"
            name="expenses"
            value={formData.expenses}
            onChange={handleChange}
            className="tw-w-full tw-rounded-md tw-border-gray-300"
            placeholder="100000"
            required
          />
        </div>

        <div>
          <label className="tw-mb-1 tw-block tw-text-sm tw-font-medium tw-text-gray-700">
            ค่าลดหย่อน (บาท)
          </label>
          <input
            type="number"
            name="exemption"
            value={formData.exemption}
            onChange={handleChange}
            className="tw-w-full tw-rounded-md tw-border-gray-300"
            placeholder="60000"
            required
          />
        </div>
      </div>

      <div className="tw-flex tw-items-center">
        <input
          type="checkbox"
          id="ask_claude"
          name="ask_claude"
          checked={formData.ask_claude}
          onChange={handleChange}
          className="mr-2 tw-h-4 tw-w-4 tw-rounded tw-border-gray-300 tw-text-blue-600"
        />
        <label htmlFor="ask_claude" className="tw-text-sm tw-text-gray-700">
          ต้องการคำอธิบายเพิ่มเติมจาก AI
        </label>
      </div>

      <button
        type="submit"
        className="tw-w-full tw-rounded-md tw-bg-blue-500 tw-px-4 tw-py-2 tw-text-white hover:tw-bg-blue-600 disabled:tw-bg-gray-300"
        disabled={
          loading ||
          !formData.base_salary ||
          !formData.expenses ||
          !formData.exemption
        }
      >
        คำนวณภาษี
      </button>
    </form>
  );
}
