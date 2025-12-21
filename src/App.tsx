import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { EditPage } from './pages/EditPage';
import { PlayPage } from './pages/PlayPage';
import { HomeScreen } from './components/home/HomeScreen';
import { LevelBrowser } from './components/home/LevelBrowser';
import { HelpPage } from './pages/HelpPage';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          {/* <Route path="/" element={<PlayPage />} /> */}
          <Route path="/" element={<HomeScreen />} />
          <Route path="/edit" element={<EditPage />} />
          <Route path="/help" element={<HelpPage />} />
          <Route path="/official" element={<LevelBrowser type="official" />} />
          <Route path="/user" element={<LevelBrowser type="user" />} />
          <Route path="/user/:authorId" element={<LevelBrowser type="author" />} />
          <Route path="/mine" element={<LevelBrowser type="mine" />} />
          <Route path="/settings" element={<div className="text-white p-10">Settings (Coming Soon)</div>} />
          <Route path="/play/:levelId" element={<PlayPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
