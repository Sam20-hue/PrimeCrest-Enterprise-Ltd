import { useSiteData, SiteSettings, SocialMedia } from '../../../context/SiteDataContext';
import { useState, useRef, useEffect } from 'react';
import RichTextEditor from '../../../components/RichTextEditor';
import { mysqlService } from '../../../services/mysqlService';

export default function AdminSettings() {
  const { settings, updateSettings } = useSiteData();
  const [form, setForm] = useState<SiteSettings>({ ...settings });
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saved, setSaved] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mysqlStatus, setMysqlStatus] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle');
  const [mysqlMsg, setMysqlMsg] = useState('');
  const [twoFaActive, setTwoFaActive] = useState(false);
  const [checkingTwoFa, setCheckingTwoFa] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState<string>(form.logoUrl);
  const [processingLogo, setProcessingLogo] = useState(false);
  const isDirty = JSON.stringify(form) !== JSON.stringify(settings) || newPassword.length > 0 || confirmPassword.length > 0;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleNumericChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value === '' ? 0 : Number(e.target.value);
    setForm({ ...form, [e.target.name]: value });
  };

  const handleSocialChange = (key: keyof SocialMedia, value: string) => {
    setForm({ ...form, socialMedia: { ...form.socialMedia, [key]: value } });
  };

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Read file as Data URL for immediate preview and optional processing
    setProcessingLogo(true);
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (ev) => resolve(ev.target?.result as string);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });

    // Apply client-side sharpening/contrast preview before upload
    const processed = await applyImageProcessing(dataUrl, form.logoSharpness || 0, form.logoContrast || 1);

    // Try uploading processed image to backend; fallback to using processed data URL
    try {
      const blob = await (await fetch(processed)).blob();
      const processedFile = new File([blob], file.name, { type: blob.type });
      const apiResult = await mysqlService.uploadImage(processedFile);
      if (apiResult.ok && apiResult.data?.url) {
        setLogoPreview(apiResult.data.url);
        setForm((prev) => ({ ...prev, logoUrl: apiResult.data?.url }));
      } else {
        setLogoPreview(processed);
        setForm((prev) => ({ ...prev, logoUrl: processed }));
      }
    } catch {
      setLogoPreview(processed);
      setForm((prev) => ({ ...prev, logoUrl: processed }));
    } finally {
      setProcessingLogo(false);
    }
  };

  // Apply sharpening + contrast using an offscreen canvas. Returns a data URL.
  const applyImageProcessing = async (dataUrl: string, sharpness: number, contrast: number) => {
    return await new Promise<string>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const maxDim = 1200;
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d')!;

        // Apply contrast via canvas filter if available
        try {
          ctx.filter = `contrast(${contrast})`;
        } catch {
          // ignore if filter not supported
        }
        ctx.drawImage(img, 0, 0, w, h);

        if (sharpness > 0) {
          // Basic unsharp mask-like convolution using a sharpening kernel scaled by strength
          try {
            const imageData = ctx.getImageData(0, 0, w, h);
            const data = imageData.data;
            const copy = new Uint8ClampedArray(data);
            // Kernel: center (1 + 4*s) and -s for neighbors (simple approximation)
            const s = Math.min(2, Math.max(0, sharpness / 2));
            const center = 1 + 4 * s;
            for (let y = 1; y < h - 1; y++) {
              for (let x = 1; x < w - 1; x++) {
                for (let c = 0; c < 3; c++) {
                  const i = (y * w + x) * 4 + c;
                  const up = ((y - 1) * w + x) * 4 + c;
                  const down = ((y + 1) * w + x) * 4 + c;
                  const left = (y * w + (x - 1)) * 4 + c;
                  const right = (y * w + (x + 1)) * 4 + c;
                  const val = center * copy[i] - s * (copy[up] + copy[down] + copy[left] + copy[right]);
                  data[i] = Math.min(255, Math.max(0, val));
                }
                // alpha remains the same
              }
            }
            ctx.putImageData(imageData, 0, 0);
          } catch {
            // convolution failed or not allowed (tainted canvas) — ignore
          }
        }

        resolve(canvas.toDataURL('image/jpeg', 0.9));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  };

  const isPasswordStrong = (password: string) => {
    if (!password) return true;
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    const fixedForm = {
      ...form,
      logoUrl: logoPreview,
      adminPassword: settings.adminPassword,
    };

    if (newPassword) {
      if (!confirmPassword) {
        setPasswordError('Please confirm your new password.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setPasswordError('Passwords do not match.');
        return;
      }
      if (!isPasswordStrong(newPassword)) {
        setPasswordError('Password must be at least 8 characters and include uppercase, lowercase, and numbers.');
        return;
      }
      const confirmed = window.confirm(
        'Confirm password change? This will permanently update the admin password.'
      );
      if (!confirmed) {
        return;
      }
      fixedForm.adminPassword = newPassword;
    }

    updateSettings(fixedForm);
    setSaved(true);
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
    setTimeout(() => setSaved(false), 2500);
  };

  const [twoFaStatus, setTwoFaStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [twoFaMessage, setTwoFaMessage] = useState('');

  const handleReset2fa = async () => {
    setTwoFaStatus('saving');
    setTwoFaMessage('Resetting 2FA...');
    const authEmail = form.adminEmail.trim() || settings.adminEmail;
    const result = await mysqlService.reset2fa(authEmail);
    if (result.ok) {
      setTwoFaStatus('success');
      setTwoFaMessage(result.data?.message || '2FA has been reset. Next login will require a new QR scan.');
      localStorage.removeItem('pc_2fa_setup');
      localStorage.removeItem('pc_2fa_setup_email');
      setTwoFaActive(false);
    } else {
      setTwoFaStatus('error');
      setTwoFaMessage(result.error || 'Failed to reset 2FA.');
    }
  };

  useEffect(() => {
    const fetchTwoFaStatus = async () => {
      setCheckingTwoFa(true);
      const authEmail = form.adminEmail.trim() || settings.adminEmail;
      if (!authEmail) {
        setTwoFaActive(false);
        setCheckingTwoFa(false);
        return;
      }

      const statusResult = await mysqlService.check2fa(authEmail);
      setTwoFaActive(statusResult.ok && !!statusResult.data?.enabled);
      setCheckingTwoFa(false);
    };

    fetchTwoFaStatus();
  }, [form.adminEmail, settings.adminEmail]);

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

  const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';
  const isCurrentLocal = currentHost === 'localhost' || currentHost === '127.0.0.1';
  const isLocalApiUrl = !!form.mysqlApiUrl && /(localhost|127\.0\.0\.1)/i.test(form.mysqlApiUrl);
  const showLocalApiWarning = !isCurrentLocal && isLocalApiUrl;

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
              <div className="w-44 h-20 flex items-center justify-center bg-white rounded-xl overflow-hidden border-2 border-gray-200" style={{ borderRadius: `${form.logoBorderRadius}px` }}>
                <img
                  src={logoPreview || form.logoUrl}
                  alt={form.logoAltText || 'Logo Preview'}
                  className="max-h-full max-w-full"
                  style={{
                    objectFit: form.logoDisplayMode,
                    filter: `contrast(${form.logoContrast})`,
                    width: `${form.logoWidth}px`,
                    height: `${form.logoHeight}px`,
                    borderRadius: `${form.logoBorderRadius}px`,
                  }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://static.readdy.ai/image/2645941fdc0e183360970fc234d34970/773766d2f6ed38db8ecc7ecb533b68b7.jpeg';
                  }}
                />
              </div>
              <div className="text-xs text-gray-500 text-center">Main preview size</div>
              
              {/* Mini preview */}
              <div className="flex justify-center gap-2">
                <div className="w-12 h-8 flex items-center justify-center bg-white rounded border border-gray-200" style={{ borderRadius: `${form.logoBorderRadius}px` }}>
                  <img
                    src={logoPreview || form.logoUrl}
                    alt={form.logoAltText || 'Mini Logo Preview'}
                    className="max-h-full max-w-full"
                    style={{
                      objectFit: form.logoDisplayMode,
                      filter: `contrast(${form.logoContrast})`,
                      width: `${Math.min(form.logoWidth, 120)}px`,
                      height: `${Math.min(form.logoHeight, 40)}px`,
                      borderRadius: `${form.logoBorderRadius}px`,
                    }}
                  />
                </div>
                <div className="text-xs text-gray-500">Navbar sample</div>
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
                    setLogoPreview('/primecrest-logo.png');
                    setForm((prev) => ({ ...prev, logoUrl: '/primecrest-logo.png' }));
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Logo Width (px)</label>
                  <input
                    type="number"
                    name="logoWidth"
                    value={form.logoWidth}
                    min={40}
                    onChange={handleNumericChange}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-400"
                    placeholder="240"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Logo Height (px)</label>
                  <input
                    type="number"
                    name="logoHeight"
                    value={form.logoHeight}
                    min={20}
                    onChange={handleNumericChange}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-400"
                    placeholder="96"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Logo Contrast</label>
                  <input
                    type="range"
                    name="logoContrast"
                    min={0.5}
                    max={2}
                    step={0.05}
                    value={form.logoContrast}
                    onChange={(e) => setForm({ ...form, logoContrast: Number(e.target.value) })}
                    className="w-full"
                  />
                  <div className="text-xs text-gray-500 mt-1">{form.logoContrast.toFixed(2)}× contrast</div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Logo Sharpness</label>
                  <input
                    type="range"
                    name="logoSharpness"
                    min={0}
                    max={5}
                    step={0.25}
                    value={form.logoSharpness || 0}
                    onChange={(e) => setForm({ ...form, logoSharpness: Number(e.target.value) })}
                    className="w-full"
                  />
                  <div className="text-xs text-gray-500 mt-1">{(form.logoSharpness || 0).toFixed(2)} sharpen</div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Logo Border Radius</label>
                  <input
                    type="number"
                    name="logoBorderRadius"
                    value={form.logoBorderRadius}
                    min={0}
                    max={50}
                    onChange={handleNumericChange}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-400"
                    placeholder="10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Logo Alt Text</label>
                <input
                  type="text"
                  name="logoAltText"
                  value={form.logoAltText}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-400"
                  placeholder="PRIMECREST ENTERPRISE LTD logo"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Logo Display Mode</label>
                <select
                  name="logoDisplayMode"
                  value={form.logoDisplayMode}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-400"
                >
                  <option value="contain">Contain</option>
                  <option value="cover">Cover</option>
                </select>
              </div>

              <div className="text-xs text-gray-400">
                <p><strong>Preview:</strong> The header logo will use the width, height, and display mode you choose here.</p>
              </div>

              {/* OR paste URL */}
              <div className="border-t border-orange-200 pt-4">
                <label className="block text-xs font-semibold text-gray-500 mb-2">Or paste image URL</label>
                <input
                  type="text"
                  name="logoUrl"
                  value={form.logoUrl}
                  onChange={(e) => { handleChange(e); setLogoPreview(e.target.value); }}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-400"
                  placeholder="https://your-logo-url.com/logo.png or /primecrest-logo.png"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Company Info ─────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl p-6 border border-gray-100 space-y-5">
          <h3 className="font-bold text-gray-900">Company Information</h3>
          {([
            { name: 'companyName', label: 'Company Name', type: 'text', placeholder: 'PRIMECREST ENTERPRISE LTD', disabled: false },
            { name: 'tagline', label: 'Tagline', type: 'text', placeholder: 'Your Trusted Security Partner', disabled: false },
            { name: 'phone', label: 'Phone Number', type: 'tel', placeholder: '0721579821', disabled: false },
            { name: 'email', label: 'Email Address', type: 'email', placeholder: 'info@primecrestenterprise.com', disabled: false },
            { name: 'address', label: 'Physical Address', type: 'text', placeholder: 'Nairobi, Kenya', disabled: false },
          ] as const).map((field) => (
            <div key={field.name}>
              <label className="block text-sm font-semibold text-gray-700 mb-2">{field.label}</label>
              <input
                type={field.type}
                name={field.name}
                value={form[field.name as keyof SiteSettings] as string}
                onChange={handleChange}
                disabled={field.disabled}
                className={`w-full px-4 py-3 border rounded-lg text-sm focus:outline-none focus:border-orange-400 ${field.disabled ? 'bg-gray-100 border-gray-200 cursor-not-allowed text-gray-500' : 'border-gray-200'}`}
                placeholder={field.placeholder}
              />
            </div>
          ))}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">About Text</label>
            <RichTextEditor
              value={form.aboutText}
              onChange={(v) => setForm({ ...form, aboutText: v })}
              rows={4}
              maxLength={500}
              placeholder="Company description..."
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Privacy Policy</label>
            <RichTextEditor
              value={form.privacyPolicy}
              onChange={(v) => setForm({ ...form, privacyPolicy: v })}
              rows={4}
              maxLength={1000}
              placeholder="Enter your privacy policy text here"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Terms of Service</label>
            <RichTextEditor
              value={form.termsOfService}
              onChange={(v) => setForm({ ...form, termsOfService: v })}
              rows={4}
              maxLength={1000}
              placeholder="Enter your terms of service text here"
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
                    type="text"
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
              type="text"
              name="mysqlApiUrl"
              value={form.mysqlApiUrl || ''}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-400"
              placeholder="https://your-api-server.com"
            />
            <p className="text-xs text-gray-400 mt-1.5">Example: https://api.primecrest.co.ke or http://localhost:3001</p>
            <p className="text-xs text-gray-400 mt-1.5">Leave this blank if your site is deployed to a PHP host and uses same-origin API endpoints like <code className="bg-gray-100 px-1 rounded">/api/*</code>.</p>
            {showLocalApiWarning && (
              <p className="text-xs text-red-500 mt-2">
                Warning: your site is currently not on localhost. A local API URL like <strong>localhost</strong> or <strong>127.0.0.1</strong> will likely fail in production.
              </p>
            )}
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
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="newPassword"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (passwordError) setPasswordError('');
                }}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-400"
                placeholder="Enter new password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-3 text-xs text-gray-600 hover:text-gray-900"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Leave blank to keep the current password. New passwords must be 8+ chars with uppercase, lowercase, and numbers.
            </p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              name="confirmPassword"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (passwordError) setPasswordError('');
              }}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-400"
              placeholder="Confirm new password"
            />
          </div>
          {passwordError && (
            <p className="text-sm text-red-600 mt-2">{passwordError}</p>
          )}
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
          <div className="flex flex-col gap-3">
            {twoFaActive ? (
              <button
                type="button"
                onClick={handleReset2fa}
                disabled={twoFaStatus === 'saving'}
                className="w-full py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Reset 2FA (Force new QR scan)
              </button>
            ) : (
              <div className="rounded-lg border border-gray-200 p-3 bg-gray-50 text-sm text-gray-600">
                {checkingTwoFa ? 'Checking 2FA status...' : '2FA is not active for this admin email.'}
              </div>
            )}
            {twoFaMessage && (
              <p className={`text-sm ${twoFaStatus === 'error' ? 'text-red-600' : 'text-green-600'}`}>
                {twoFaMessage}
              </p>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={!isDirty || mysqlStatus === 'testing'}
          className={`px-8 py-3.5 rounded-lg text-white font-bold transition-colors flex items-center gap-2 whitespace-nowrap ${
            !isDirty || mysqlStatus === 'testing'
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-orange-600 hover:bg-orange-700 cursor-pointer'
          }`}
        >
          <i className="ri-save-line" />
          {saved ? 'Settings Saved!' : isDirty ? 'Save All Settings' : 'No changes to save'}
        </button>
      </form>
    </div>
  );
}
