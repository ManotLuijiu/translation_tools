import React, { useState, useEffect } from 'react';

const TaxContext = React.createContext();

export function TaxContextProvider({ children }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = React.useState(null);
  const [licenseKey, setLicenseKey] = React.useState('');

  useEffect(() => {
    // Get license key from server
    frappe.call({
      method: 'translation_tools.api.tax_consultant.get_license_key',
      callback: function (r) {
        if (r.message && r.message.license_key) {
          setLicenseKey(r.message.license_key);
        }
      },
    });

    // Add welcome message
    setMessages([
      {
        role: 'assistant',
        content:
          'สวัสดีค่ะ ฉันเป็นผู้ช่วยให้คำปรึกษาด้านภาษีอากร คุณสามารถถามคำถามเกี่ยวกับภาษีไทยได้เลยค่ะ',
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);
  }, []);

  const sendQuestion = async (question) => {
    if (!question.trim()) {
      return;
    }

    // Add user message to chat
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: question, timestamp: new Date() },
    ]);

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        'https://tax-consultant.bunchee.online/ask-tax-ai',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: frappe.session.user_fullname,
            question: question,
            license_key: licenseKey,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const data = await response.json();

      // Add assistant response to chat
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.answer,
          timestamp: new Date(),
          metadata: {
            chunks_used: data.chunks_info || data.sources,
            total_chunks: data.total_chunks,
            retrieval_method: data.retrieval_method,
            complexity_score: data.complexity_score,
          },
        },
      ]);
    } catch (error) {
      console.error('Error sending question:', error);
      setError(error.message);

      // Add error message
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            'ขออภัยค่ะ เกิดข้อผิดพลาดในการเชื่อมต่อกับระบบ โปรดลองอีกครั้งในภายหลัง',
          timestamp: new Date().toLocaleTimeString(),
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const clearMessages = () => {
    setMessages([]);
  };

  const calculateTax = async (data) => {
    setLoading(true);
    setError(null);
    // Add calculator request to chat
    const requestMessage = `
        คำนวณภาษีเงินได้บุคคลธรรมดา:
        - เงินได้: ${data.base_salary} บาท
        - ค่าใช้จ่าย: ${data.expenses} บาท
        - ค่าลดหย่อน: ${data.exemption} บาท
        ${data.ask_claude ? '- ต้องการคำอธิบาย: ใช่' : ''}
    `;

    setMessages((prev) => [
      ...prev,
      { role: 'user', content: requestMessage, timestamp: new Date() },
    ]);

    try {
      const response = await fetch(
        'https://tax-consultant.bunchee.online/calculate-tax',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: frappe.session.user_fullname,
            base_salary: parseFloat(data.base_salary),
            expenses: parseFloat(data.expenses),
            exemption: parseFloat(data.exemption),
            ask_claude: data.ask_claude,
            license_key: licenseKey,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const result = await response.json();

      // Format the response
      let responseMessage = `
            ผลการคำนวณภาษี:
            - เงินได้: ${result.base_salary.toLocaleString()} บาท
            - ค่าใช้จ่าย: ${result.expenses.toLocaleString()} บาท
            - ค่าลดหย่อน: ${result.exemption.toLocaleString()} บาท
            - เงินได้สุทธิ: ${result.taxable_income.toLocaleString()} บาท
            - ภาษีที่ต้องชำระ: ${result.calculated_tax.toLocaleString()} บาท
      `;

      // Add explanation if available
      if (result.claude_explanation) {
        responseMessage += `\n\n${result.claude_explanation}`;
      }

      // Add assistant response to chat
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: responseMessage,
          timestamp: new Date(),
          metadata: {
            calculation: result,
          },
        },
      ]);
    } catch (err) {
      console.error('Error calculating tax:', err);
      setError(err.message);

      // Add error message
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            'ขออภัยค่ะ เกิดข้อผิดพลาดในการคำนวณภาษี โปรดลองอีกครั้งในภายหลัง',
          timestamp: new Date().toLocaleTimeString(),
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const newConversation = () => {
    setMessages([
      {
        role: 'assistant',
        content:
          'สวัสดีค่ะ ฉันเป็นผู้ช่วยให้คำปรึกษาด้านภาษีอากร คุณสามารถถามคำถามเกี่ยวกับภาษีไทยได้เลยค่ะ',
        timestamp: new Date(),
      },
    ]);
    setError(null);
  };

  const value = {
    messages,
    loading,
    error,
    sendQuestion,
    calculateTax,
    newConversation,
  };

  return <TaxContext.Provider value={value}>{children}</TaxContext.Provider>;
}

export function useTaxContext() {
  const context = React.useContext(TaxContext);
  if (!context || context === undefined) {
    throw new Error('useTaxContext must be used within a TaxContextProvider');
  }
  return context;
}
