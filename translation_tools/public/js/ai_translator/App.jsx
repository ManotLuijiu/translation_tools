import * as React from "react";

export function App() {
  const dynamicMessage = React.useState("Hello from App.jsx");
  return (
    <div className="m-4">
      <h3>{dynamicMessage}</h3>
      <h4>Start editing at translation_tools/public/js/ai_translator/App.jsx</h4>
    </div>
  );
}