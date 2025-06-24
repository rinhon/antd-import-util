import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import UploadProgress from "./utils/upload-progress";

const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/upload-progress" element={<UploadProgress />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;
