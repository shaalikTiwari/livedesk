import { BrowserRouter, Routes, Route } from "react-router-dom";
import Widget from "./pages/Widget";
import WidgetEmbed from "./pages/WidgetEmbed";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Widget />} />
        <Route path="/widget-embed" element={<WidgetEmbed />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;