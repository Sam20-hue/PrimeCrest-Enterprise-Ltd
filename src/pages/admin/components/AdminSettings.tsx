import { useSiteData, SiteSettings, SocialMedia } from '../../../context/SiteDataContext';
import { useState, useRef } from 'react';
import { mysqlService } from '../../../services/mysqlService';

export default function AdminSettings() {
  const { settings, updateSettings } = useSiteData();
  const [form, setForm] = useState<SiteSettings>({ ...settings });
  const [saved, setSaved] = useState(false);
  const [mysqlStatus, setMysqlStatus] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle');
  const [mysqlMsg, setMysqlMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState<string>(form.logoUrl);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSocialChange = (key: keyof SocialMedia, value: string) => {
    setForm({ ...form, socialMedia: { ...form.socialMedia, [key]: value } });
  };

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const apiResult = await mysqlService.uploadImage(file);
    if (apiResult.ok && apiResult.data?.url) {
      setLogoPreview(apiResult.data.url);
      setForm((prev) => ({ ...prev, logoUrl: apiResult.data?.url }));
      return;
    }

    // Fallback to data URL for local preview if backend upload not configured
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setLogoPreview(dataUrl);
      setForm((prev) => ({ ...prev, logoUrl: dataUrl }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({ ...form, logoUrl: logoPreview });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleTestMySQL = async () => {
    setMysqlStatus('testing');
    setMysqlMsg('');
    const result = await mysqlService.ping();
    if (result.ok) {
      setMysqlStatus('ok');
      setMysqlMsg('Connection successful! API is reachable.');
    } else {
      setMysqlStatus('fail');
      setMysqlMsg(result.error || 'Connection failed.');
    }
  };

  const socialFields: { key: keyof SocialMedia; label: string; icon: string; placeholder: string }[] = [
    { key: 'facebook', label: 'Facebook', icon: 'ri-facebook-fill', placeholder: 'https://facebook.com/yourpage' },
    { key: 'instagram', label: 'Instagram', icon: 'ri-instagram-line', placeholder: 'https://instagram.com/yourhandle' },
    { key: 'twitter', label: 'X / Twitter', icon: 'ri-twitter-x-line', placeholder: 'https://x.com/yourhandle' },
    { key: 'linkedin', label: 'LinkedIn', icon: 'ri-linkedin-fill', placeholder: 'https://linkedin.com/company/yourcompany' },
    { key: 'whatsapp', label: 'WhatsApp', icon: 'ri-whatsapp-line', placeholder: 'https://wa.me/254700000000' },
    { key: 'youtube', label: 'YouTube', icon: 'ri-youtube-line', placeholder: 'https://youtube.com/@yourchannel' },
    { key: 'tiktok', label: 'TikTok', icon: 'ri-tiktok-line', placeholder: 'https://tiktok.com/@yourhandle' },
  ];

  return (
    <div>
      <h2 className="text-2xl font-black text-gray-900 mb-8">Site Settings</h2>
      <form onSubmit={handleSave} className="space-y-6 max-w-2xl">

        {/* ── Logo Upload ─────────────────────────────────────────────────── */}
        <div className="bg-orange-50 rounded-xl p-6 border border-orange-100">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <i className="ri-image-line text-orange-600" />
            Company Logo
          </h3>
          <div className="flex items-start gap-6">
            {/* Preview with multiple sizes */}
            <div className="flex-shrink-0 space-y-3">
              <div className="w-44 h-20 flex items-center justify-center bg-white rounded-xl overflow-hidden border-2 border-gray-200">
                <img
                  src={logoPreview || form.logoUrl}
                  alt="Logo Preview"
                  className="max-h-full max-w-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://static.readdy.ai/image/2645941fdc0e183360970fc234d34970/773766d2f6ed38db8ecc7ecb533b68b7.jpeg';
                  }}
                />
              </div>
              <div className="text-xs text-gray-500 text-center">Main Size (300×100)</div>
              
              {/* Mini preview */}
              <div className="flex justify-center gap-2">
                <div className="w-12 h-8 flex items-center justify-center bg-white rounded border border-gray-200">
                  <img
                    src={logoPreview || form.logoUrl}
                    alt="Mini Preview"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <div className="text-xs text-gray-500">Navbar</div>
              </div>
            </div>
            
            <div className="flex-1 space-y-4">
              {/* Upload buttons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 text-white text-sm font-semibold rounded-lg cursor-pointer hover:bg-orange-700 transition-colors"
                >
                  <i className="ri-upload-2-line" /> Upload New Logo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLogoPreview('https://static.readdy.ai/image/2645941fdc0e183360970fc234d34970/773766d2f6ed38db8ecc7ecb533b68b7.jpeg');
                    setForm((prev) => ({ ...prev, logoUrl: 'https://static.readdy.ai/image/2645941fdc0e183360970fc234d34970/773766d2f6ed38db8ecc7ecb533b68b7.jpeg' }));
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 text-sm font-semibold rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <i className="ri-refresh-line" /> Use Default
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLogoPreview('');
                    setForm((prev) => ({ ...prev, logoUrl: '' }));
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 border border-red-300 text-red-700 text-sm font-semibold rounded-lg cursor-pointer hover:bg-red-50 transition-colors"
                >
                  <i className="ri-delete-bin-line" /> Remove Logo
                </button>
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoFileChange}
              />
              
              <div className="text-xs text-gray-400">
                <p className="mb-1"><strong>Recommended:</strong> PNG, JPG, or SVG format</p>
                <p><strong>Sizes:</strong> Main logo 300×100px, Navbar 120×40px</p>
                <p><strong>Tip:</strong> Transparent backgrounds work best</p>
              </div>
              
              {/* OR paste URL */}
              <div className="border-t border-orange-200 pt-4">
                <label className="block text-xs font-semibold text-gray-500 mb-2">Or paste image URL</label>
                <input
                  type="url"
                  name="logoUrl"
                  value={form.logoUrl}
                  onChange={(e) => { handleChange(e); setLogoPreview(e.target.value); }}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-400"
                  placeholder="https://your-logo-url.com/logo.png"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Company Info ─────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl p-6 border border-gray-100 space-y-5">
          <h3 className="font-bold text-gray-900">Company Information</h3>
          {([
            { name: 'companyName', label: 'Company Name', type: 'text', placeholder: 'PRIMECREST ENTERPRISE LTD' },
            { name: 'tagline', label: 'Tagline', type: 'text', placeholder: 'Your Trusted Security Partner' },
            { name: 'phone', label: 'Phone Number', type: 'tel', placeholder: '+254 700 000 000' },
            { name: 'email', label: 'Email Address', type: 'email', placeholder: 'info@company.co.ke' },
            { name: 'address', label: 'Physical Address', type: 'text', placeholder: 'Nairobi, Kenya' },
          ] as const).map((field) => (
            <div key={field.name}>
              <label className="block text-sm font-semibold text-gray-700 mb-2">{field.label}</label>
              <input
                type={field.type}
                name={field.name}
                value={(form as Record<string, string>)[field.name]}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-400"
                placeholder={field.placeholder}
              />
            </div>
          ))}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">About Text</label>
            <textarea
              name="aboutText"
              value={form.aboutText}
              onChange={handleChange}
              rows={4}
              maxLength={500}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-400 resize-none"
              placeholder="Company description..."
            />
          </div>
        </div>

        {/* ── Hero Content ─────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl p-6 border border-gray-100 space-y-5">
          <h3 className="font-bold text-gray-900">Homepage Hero Content</h3>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Hero Title</label>
            <input type="text" name="heroTitle" value={form.heroTitle} onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-400" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Hero Subtitle</label>
            <input type="text" name="heroSubtitle" value={form.heroSubtitle} onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-400" />
          </div>
        </div>

        {/* ── Social Media ──────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl p-6 border border-gray-100 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <span className="w-8 h-8 flex items-center justify-center bg-orange-100 rounded-lg">
              <i className="ri-share-line text-orange-600" />
            </span>
            <h3 className="font-bold text-gray-900">Social Media Links</h3>
          </div>
          <p className="text-xs text-gray-400 -mt-2 mb-3">Paste the full URL for each platform. Leave empty to hide it from the website.</p>
          <div className="grid grid-cols-1 gap-4">
            {socialFields.map((field) => (
              <div key={field.key} className="flex items-center gap-3">
                <span className="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-100 flex-shrink-0">
                  <i className={`${field.icon} text-gray-600 text-base`} />
                </span>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">{field.label}</label>
                  <input
                    type="url"
                    value={(form.socialMedia || {})[field.key] || ''}
                    onChange={(e) => handleSocialChange(field.key, e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-400"
                    placeholder={field.placeholder}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── MySQL API Connection ──────────────────────────────────────────── */}
        <div className="bg-white rounded-xl p-6 border border-gray-100 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <span className="w-8 h-8 flex items-center justify-center bg-blue-100 rounded-lg">
              <i className="ri-database-2-line text-blue-600" />
            </span>
            <h3 className="font-bold text-gray-900">MySQL Database Connection</h3>
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-xs text-blue-700 leading-relaxed">
            <strong>How it works:</strong> This app connects to MySQL via a REST API backend you deploy separately
            (Node.js/Express + mysql2, PHP, or any backend). Enter your API&apos;s base URL below.
            See <code className="bg-blue-100 px-1 rounded">src/services/mysqlService.ts</code> for full setup instructions.
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">MySQL API Base URL</label>
            <input
              type="url"
              name="mysqlApiUrl"
              value={form.mysqlApiUrl || ''}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-400"
              placeholder="https://your-api-server.com"
            />
            <p className="text-xs text-gray-400 mt-1.5">Example: https://api.primecrest.co.ke or http://localhost:3001</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleTestMySQL}
              disabled={!form.mysqlApiUrl || mysqlStatus === 'testing'}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-50 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {mysqlStatus === 'testing' ? (
                <><i className="ri-loader-4-line animate-spin" /> Testing...</>
              ) : (
                <><i className="ri-wifi-line" /> Test Connection</>
              )}
            </button>
            {mysqlStatus === 'ok' && (
              <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
                <i className="ri-checkbox-circle-fill" /> {mysqlMsg}
              </span>
            )}
            {mysqlStatus === 'fail' && (
              <span className="flex items-center gap-1.5 text-sm text-red-500 font-medium">
                <i className="ri-error-warning-fill" /> {mysqlMsg}
              </span>
            )}
          </div>
        </div>

        {/* ── Admin Security ──────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl p-6 border border-gray-100 space-y-4">
          <h3 className="font-bold text-gray-900">Security</h3>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Admin Password</label>
            <input
              type="password"
              name="adminPassword"
              value={form.adminPassword}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-400"
              placeholder="Enter new password"
            />
            <p className="text-xs text-gray-400 mt-2">Change your admin panel password here. Keep it secure.</p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Admin Verification Email</label>
            <input
              type="email"
              name="adminEmail"
              value={form.adminEmail}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-400"
              placeholder="samsonakula3@gmail.com"
            />
            <p className="text-xs text-gray-400 mt-2">Verification codes will be sent to this email during login.</p>
          </div>
        </div>

        <button
          type="submit"
          className="px-8 py-3.5 bg-orange-600 text-white font-bold rounded-lg hover:bg-orange-700 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap"
        >
          <i className="ri-save-line" />
          {saved ? 'Settings Saved!' : 'Save All Settings'}
        </button>
      </form>
    </div>
  );
}
