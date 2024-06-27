import { Route, Routes } from "react-router-dom";

import { Home } from "./pages";

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="*" element={<h1>404 not found</h1>} />
      </Routes>
    </>
  );
}

export default App;
