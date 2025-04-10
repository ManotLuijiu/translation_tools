import * as React from "react";

export function App() {
  const dynamicMessage = React.useState("Hello from App.jsx");
  return (
    <div className="m-4 text-center text-moo-blue">
      <h3>{dynamicMessage}</h3>
      <h4>
        Start editing at translation_tools/public/js/translation_tools/App.jsx
      </h4>
    </div>
  );
}
