import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSiteData } from '../../context/SiteDataContext';
import { translations } from '../../i18n/translations';

export default function Footer() {
  const { settings, language } = useSiteData();
  const t = translations[language].footer;
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setEmail('');
    }
  };

  const serviceLinks = [
    { label: 'CCTV Systems', path: '/services' },
    { label: 'Vault Engineering', path: '/services' },
    { label: 'Biometric Access', path: '/services' },
    { label: 'Alarm Systems', path: '/services' },
    { label: 'Strong Door Installation', path: '/services' },
    { label: 'IT Engineering', path: '/services' },
  ];

  const companyLinks = [
    { label: 'About Us', path: '/about' },
    { label: 'Gallery', path: '/gallery' },
    { label: 'Blog', path: '/blog' },
    { label: 'Contact', path: '/contact' },
  ];

  const sm = settings.socialMedia || {};
  const socialLinks = [
    { icon: 'ri-facebook-fill', url: sm.facebook, label: 'Facebook' },
    { icon: 'ri-instagram-line', url: sm.instagram, label: 'Instagram' },
    { icon: 'ri-twitter-x-line', url: sm.twitter, label: 'X / Twitter' },
    { icon: 'ri-linkedin-fill', url: sm.linkedin, label: 'LinkedIn' },
    { icon: 'ri-whatsapp-line', url: sm.whatsapp, label: 'WhatsApp' },
    { icon: 'ri-youtube-line', url: sm.youtube, label: 'YouTube' },
    { icon: 'ri-tiktok-line', url: sm.tiktok, label: 'TikTok' },
  ].filter((s) => s.url && s.url.trim() !== '');

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div>
            <img
              src={settings.logoUrl}
              alt={settings.companyName}
              className="h-24 w-auto max-w-[280px] object-contain mb-4"
              style={{ background: 'none', border: 'none', boxShadow: 'none', borderRadius: 0 }}
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  'https://static.readdy.ai/image/2645941fdc0e183360970fc234d34970/773766d2f6ed38db8ecc7ecb533b68b7.jpeg';
              }}
            />
            <p className="text-sm leading-relaxed text-gray-400 mb-5">
              {settings.tagline}. Comprehensive security and technology solutions for businesses and institutions across Kenya.
            </p>
            {/* Dynamic social media links */}
            {socialLinks.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {socialLinks.map((s) => (
                  <a
                    key={s.icon}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={s.label}
                    className="w-9 h-9 flex items-center justify-center rounded-full border border-gray-700 text-gray-400 hover:border-orange-500 hover:text-orange-500 transition-colors cursor-pointer"
                  >
                    <i className={`${s.icon} text-sm`} />
                  </a>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {['ri-facebook-fill', 'ri-instagram-line', 'ri-twitter-x-line', 'ri-linkedin-fill', 'ri-whatsapp-line'].map((icon) => (
                  <span
                    key={icon}
                    className="w-9 h-9 flex items-center justify-center rounded-full border border-gray-700 text-gray-600"
                  >
                    <i className={`${icon} text-sm`} />
                  </span>
                ))}
                <span className="text-xs text-gray-600 self-center ml-1">Add links in Admin</span>
              </div>
            )}
          </div>

          {/* Services */}
          <div>
            <h4 className="text-white font-semibold text-base mb-5">{t.services_title}</h4>
            <ul className="space-y-2.5">
              {serviceLinks.map((link) => (
                <li key={link.label}>
                  <Link to={link.path} className="text-sm text-gray-400 hover:text-orange-400 transition-colors cursor-pointer">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-white font-semibold text-base mb-5">{t.company_title}</h4>
            <ul className="space-y-2.5">
              {companyLinks.map((link) => (
                <li key={link.label}>
                  <Link to={link.path} className="text-sm text-gray-400 hover:text-orange-400 transition-colors cursor-pointer">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="text-white font-semibold text-base mb-3">{t.newsletter_title}</h4>
            <p className="text-sm text-gray-400 mb-4">{t.newsletter_desc}</p>
            {subscribed ? (
              <p className="text-sm text-orange-400 font-medium">Thanks for subscribing!</p>
            ) : (
              <form onSubmit={handleSubscribe} className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.email_placeholder}
                  className="flex-1 px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                  required
                />
                <button type="submit" className="px-4 py-2 bg-orange-600 text-white text-sm rounded-md hover:bg-orange-700 transition-colors cursor-pointer whitespace-nowrap">
                  {t.subscribe}
                </button>
              </form>
            )}
            <div className="mt-6 space-y-2 text-sm text-gray-400">
              <a href={`tel:${settings.phone}`} className="flex items-center gap-2 hover:text-orange-400 cursor-pointer">
                <span className="w-4 h-4 flex items-center justify-center"><i className="ri-phone-line" /></span>
                {settings.phone}
              </a>
              <a href={`mailto:${settings.email}`} className="flex items-center gap-2 hover:text-orange-400 cursor-pointer">
                <span className="w-4 h-4 flex items-center justify-center"><i className="ri-mail-line" /></span>
                {settings.email}
              </a>
              <p className="flex items-start gap-2">
                <span className="w-4 h-4 flex items-center justify-center mt-0.5"><i className="ri-map-pin-line" /></span>
                {settings.address}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
          <p>© {new Date().getFullYear()} {settings.companyName}. {t.rights}</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-orange-400 cursor-pointer">{t.privacy}</a>
            <a href="#" className="hover:text-orange-400 cursor-pointer">{t.terms}</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
