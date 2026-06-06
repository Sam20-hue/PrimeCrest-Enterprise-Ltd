import { useState } from 'react';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { AppRoutes } from './router';
import { SiteDataProvider } from './context/SiteDataContext';
import Navbar from './components/feature/Navbar';
import Footer from './components/feature/Footer';
import LanguageModal from './components/feature/LanguageModal';

function Layout() {
  const location = useLocation();
  const [langOpen, setLangOpen] = useState(false);
  const isAdmin = location.pathname === '/admin';
  const isServiceDetail = /^\/services\/[^/]+$/.test(location.pathname);

  return (
    <>
      {!isAdmin && !isServiceDetail && <Navbar onLanguageClick={() => setLangOpen(true)} />}
      <AppRoutes />
      {!isAdmin && !isServiceDetail && <Footer />}
      <LanguageModal isOpen={langOpen} onClose={() => setLangOpen(false)} />
    </>
  );
}

function App() {
  return (
    <SiteDataProvider>
      <BrowserRouter basename={__BASE_PATH__}>
        <Layout />
      </BrowserRouter>
    </SiteDataProvider>
  );
}

export default App;
