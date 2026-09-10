import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./shared/design-system/tokens.css";
import "./shared/design-system/components.css";
import "./index.css";
import App from "./App.jsx";
import { AuthProvider } from "./authentication_service/context/AuthProvider.jsx";
import { ThemeProvider } from "./shared/context/ThemeContext.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>
);