import { useState, useEffect } from 'react';
import AdminLogin from './components/AdminLogin';
import AdminSettings from './components/AdminSettings';
import AdminServices from './components/AdminServices';
import AdminGallery from './components/AdminGallery';
import AdminBlog from './components/AdminBlog';
import AdminTeam from './components/AdminTeam';
import AdminContacts from './components/AdminContacts';
import { useSiteData } from '../../context/SiteDataContext';
import { mysqlService } from '../../services/mysqlService';

type Tab = 'settings' | 'services' | 'gallery' | 'blog' | 'team' | 'contacts';

const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: 'settings', label: 'Settings', icon: 'ri-settings-3-line' },
  { id: 'services', label: 'Services', icon: 'ri-tools-line' },
  { id: 'gallery', label: 'Gallery', icon: 'ri-image-line' },
  { id: 'blog', label: 'Blog', icon: 'ri-article-line' },
  { id: 'team', label: 'Team', icon: 'ri-team-line' },
  { id: 'contacts', label: 'Contacts', icon: 'ri-mail-line' },
];

export default function AdminPage() {
  const { services, gallery, blogPosts, team, contacts, setContacts } = useSiteData();
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return sessionStorage.getItem('pc_admin_session') === '1';
  });
  const [activeTab, setActiveTab] = useState<Tab>('settings');

  // Load contacts when admin page loads
  useEffect(() => {
    if (isLoggedIn && contacts.length === 0) {
      const loadContacts = async () => {
        const result = await mysqlService.getContacts();
        if (result.ok && result.data) {
          setContacts(result.data);
        }
      };
      loadContacts();
    }
  }, [isLoggedIn, contacts.length, setContacts]);

  const handleLogin = () => {
    sessionStorage.setItem('pc_admin_session', '1');
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('pc_admin_session');
    setIsLoggedIn(false);
  };

  if (!isLoggedIn) {
    return <AdminLogin onLogin={handleLogin} />;
  }

  const counts: Record<Tab, number> = {
    settings: 0,
    services: services.length,
    gallery: gallery.length,
    blog: blogPosts.length,
    team: team.length,
    contacts: contacts.length,
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 flex flex-col flex-shrink-0">
        <div className="p-6 border-b border-gray-800">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Admin Panel</p>
          <h1 className="text-white font-black text-sm leading-tight">PRIMECREST<br />ENTERPRISE LTD</h1>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all cursor-pointer text-left ${
                activeTab === tab.id
                  ? 'bg-orange-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <span className="w-5 h-5 flex items-center justify-center">
                <i className={`${tab.icon} text-base`} />
              </span>
              <span className="text-sm font-medium flex-1">{tab.label}</span>
              {counts[tab.id] > 0 && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  activeTab === tab.id ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-400'
                }`}>
                  {counts[tab.id]}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-800 space-y-2">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition-all cursor-pointer"
          >
            <span className="w-5 h-5 flex items-center justify-center">
              <i className="ri-external-link-line text-base" />
            </span>
            <span className="text-sm font-medium">View Website</span>
          </a>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-gray-400 hover:bg-red-900/30 hover:text-red-400 transition-all cursor-pointer"
          >
            <span className="w-5 h-5 flex items-center justify-center">
              <i className="ri-logout-box-line text-base" />
            </span>
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Top Bar */}
        <div className="bg-white border-b border-gray-200 px-8 py-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-gray-900">
              {tabs.find((t) => t.id === activeTab)?.label}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">Manage your website content</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="w-4 h-4 flex items-center justify-center">
              <i className="ri-shield-check-line text-green-500" />
            </span>
            Admin Access
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {activeTab === 'settings' && <AdminSettings />}
          {activeTab === 'services' && <AdminServices />}
          {activeTab === 'gallery' && <AdminGallery />}
          {activeTab === 'blog' && <AdminBlog />}
          {activeTab === 'team' && <AdminTeam />}
          {activeTab === 'contacts' && <AdminContacts />}
        </div>
      </main>
    </div>
  );
}