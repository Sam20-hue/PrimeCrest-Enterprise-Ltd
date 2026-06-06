import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSiteData } from '../../context/SiteDataContext';
import { translations, type Lang } from '../../i18n/translations';

interface NavbarProps {
  onLanguageClick: () => void;
}

export default function Navbar({ onLanguageClick }: NavbarProps) {
  const { settings, language } = useSiteData();
  const t = translations[language].nav;
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const isHomePage = location.pathname === '/';

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // On sub-pages always use white bg; on home page transparent until scrolled
  const showWhiteBg = !isHomePage || scrolled;
  const logoWidth = settings.logoWidth > 0 ? settings.logoWidth : 240;
  const logoHeight = settings.logoHeight > 0 ? settings.logoHeight : 96;

  const isActive = (path: string) => location.pathname === path;

  const navLinks = [
    { path: '/', label: t.home },
    { path: '/services', label: t.services },
    { path: '/gallery', label: t.gallery },
    { path: '/blog', label: t.blog },
    { path: '/about', label: t.about },
    { path: '/contact', label: t.contact },
  ];

  const languageFlagMap: Record<Lang, string> = {
    en: '🇬🇧',
    fr: '🇫🇷',
    es: '🇪🇸',
    ar: '🇸🇦',
    de: '🇩🇪',
    pt: '🇵🇹',
  };

  const languageLabelMap: Record<Lang, string> = {
    en: 'EN',
    fr: 'FR',
    es: 'ES',
    ar: 'AR',
    de: 'DE',
    pt: 'PT',
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        showWhiteBg ? 'bg-white shadow-sm border-b border-gray-100' : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
        {/* Logo — borderless, no boundary */}
        <Link to="/" className="flex items-center cursor-pointer">
          <img
            src={settings.logoUrl}
            alt={settings.companyName}
            width={240}
            height={96}
            className="h-28 md:h-32 w-auto max-w-[320px] object-contain"
            style={{ background: 'none', border: 'none', boxShadow: 'none', borderRadius: 0 }}
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                'https://static.readdy.ai/image/2645941fdc0e183360970fc234d34970/773766d2f6ed38db8ecc7ecb533b68b7.jpeg';
            }}
          />
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-0.5">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 whitespace-nowrap cursor-pointer ${
                isActive(link.path)
                  ? 'text-orange-600 bg-orange-50'
                  : showWhiteBg
                  ? 'text-gray-700 hover:text-orange-600 hover:bg-orange-50'
                  : 'text-white hover:text-orange-300'
              }`}
            >
              {link.label}
            </Link>
          ))}
          <button
            onClick={onLanguageClick}
            aria-label={t.language}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition-all duration-200 whitespace-nowrap cursor-pointer ${
              showWhiteBg
                ? 'border-gray-200 bg-white text-gray-700 hover:border-orange-300 hover:text-orange-600 hover:bg-orange-50'
                : 'border-white/30 bg-white/10 text-white hover:border-white hover:text-orange-300 hover:bg-white/10'
            }`}
          >
            <span className="text-base leading-none">{languageFlagMap[language] ?? '🌐'}</span>
            <span>{languageLabelMap[language] ?? language.toUpperCase()}</span>
            <i className="ri-arrow-down-s-line text-base leading-none" />
          </button>
          <Link
            to="/contact"
            className="ml-3 px-5 py-2 bg-orange-600 text-white text-sm font-semibold rounded-md hover:bg-orange-700 transition-colors whitespace-nowrap cursor-pointer"
          >
            {translations[language].hero.cta_primary}
          </Link>
        </nav>

        {/* Mobile Toggle */}
        <button
          className={`lg:hidden w-9 h-9 flex items-center justify-center rounded-md cursor-pointer ${
            showWhiteBg ? 'text-gray-700' : 'text-white'
          }`}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <i className={`${menuOpen ? 'ri-close-line' : 'ri-menu-line'} text-2xl`} />
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="lg:hidden bg-white border-t border-gray-100 shadow-lg">
          <div className="px-6 py-4 flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMenuOpen(false)}
                className={`px-4 py-2.5 text-sm font-medium rounded-md transition-all cursor-pointer ${
                  isActive(link.path)
                    ? 'text-orange-600 bg-orange-50'
                    : 'text-gray-700 hover:text-orange-600 hover:bg-orange-50'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <button
              onClick={() => { onLanguageClick(); setMenuOpen(false); }}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 hover:text-orange-600 hover:bg-orange-50 rounded-md flex items-center gap-2 cursor-pointer"
            >
              <i className="ri-global-line" /> {t.language}
            </button>
            <Link
              to="/contact"
              onClick={() => setMenuOpen(false)}
              className="mt-2 px-4 py-2.5 bg-orange-600 text-white text-sm font-semibold rounded-md text-center cursor-pointer"
            >
              {translations[language].hero.cta_primary}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
