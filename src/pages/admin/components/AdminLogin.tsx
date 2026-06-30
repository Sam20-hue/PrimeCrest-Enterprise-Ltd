import { useState, useEffect } from 'react';
import { useSiteData } from '../../../context/SiteDataContext';
import { mysqlService } from '../../../services/mysqlService';

interface AdminLoginProps {
  onLogin: () => void;
}

export default function AdminLogin({ onLogin }: AdminLoginProps) {
  const { settings } = useSiteData();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [step, setStep] = useState<'password' | 'setup' | 'verify'>('password');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [otpauthUrl, setOtpauthUrl] = useState('');
  const [qrLoadFailed, setQrLoadFailed] = useState(false);
  const [is2faSetup, setIs2faSetup] = useState(false);
  const [is2faChecking, setIs2faChecking] = useState(true);

  useEffect(() => {
    const checkSavedState = async () => {
      setIs2faChecking(true);
      const defaultEmail = 'samsonakula3@gmail.com';
      const currentEmail = settings.adminEmail || defaultEmail;
      const statusRes = await mysqlService.check2fa(currentEmail);
      const savedLocal = localStorage.getItem('pc_2fa_setup') === 'true';
      const savedEmail = localStorage.getItem('pc_2fa_setup_email');
      const localEmailMatches = savedEmail === currentEmail;

      if (statusRes.ok && (statusRes.data?.setup || statusRes.data?.enabled)) {
        setIs2faSetup(true);
        localStorage.setItem('pc_2fa_setup', 'true');
        localStorage.setItem('pc_2fa_setup_email', currentEmail);
      } else if (!statusRes.ok && savedLocal && localEmailMatches) {
        setIs2faSetup(true);
        setError('2FA server unavailable, using local setup state fallback.');
      } else {
        setIs2faSetup(false);
        localStorage.removeItem('pc_2fa_setup');
        localStorage.removeItem('pc_2fa_setup_email');
      }
      setIs2faChecking(false);
    };
    checkSavedState();
  }, [settings.adminEmail]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (is2faChecking) {
      setError('Checking 2FA status, please wait...');
      return;
    }

    if (!email.trim()) {
      setError('Please enter your admin email.');
      return;
    }

    if (email.trim() !== (settings.adminEmail || 'samsonakula3@gmail.com')) {
      setError('Email or password is incorrect.');
      return;
    }

    if (password !== (settings.adminPassword || 'admin123')) {
      setError('Email or password is incorrect.');
      return;
    }

    // Email and password correct, move to 2FA
    const localFlag = localStorage.getItem('pc_2fa_setup') === 'true';
    if (is2faSetup || localFlag) {
      // User has already set up 2FA, ask for token
      setStep('verify');
      setStatus('Enter the 6-digit code from your authenticator app.');
    } else {
      // First time, setup 2FA
      await setupNewTotp();
    }
  };

  const setupNewTotp = async () => {
    setStatus('Generating QR code...');
    const authEmail = email.trim() || settings.adminEmail || 'samsonakula3@gmail.com';
    const response = await mysqlService.setup2fa(authEmail);

    if (response.ok && response.data) {
      setQrCode(response.data.qrCode);
      setOtpauthUrl(response.data.otpauthUrl || '');
      setSecret(response.data.secret);
      setQrLoadFailed(false);
      setStep('setup');
      setStatus('');
    } else {
      setError(response.error || 'Failed to setup 2FA.');
    }
  };

  const handleSetupConfirm = async () => {
    if (!token) {
      setError('Please enter the 6-digit code from your app.');
      return;
    }

    setStatus('Verifying token...');
    const authEmail = email.trim() || settings.adminEmail || 'samsonakula3@gmail.com';
    const response = await mysqlService.verify2fa(authEmail, token);

    if (response.ok) {
      localStorage.setItem('pc_2fa_setup', 'true');
      localStorage.setItem('pc_2fa_setup_email', authEmail);
      setIs2faSetup(true);
      setError('');
      onLogin();
    } else {
      setError(`${response.error || 'Invalid token. Please try again.'} If this continues, press Reset 2FA and scan the QR code again.`);
      setStatus('');
    }
  };

  const handleVerifyToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Please enter the 6-digit code from your authenticator app.');
      return;
    }

    setStatus('Verifying token...');
    const authEmail = email.trim() || settings.adminEmail || 'samsonakula3@gmail.com';
    const response = await mysqlService.verify2fa(authEmail, token);

    if (response.ok) {
      localStorage.setItem('pc_2fa_setup', 'true');
      localStorage.setItem('pc_2fa_setup_email', authEmail);
      setIs2faSetup(true);
      setError('');
      onLogin();
    } else {
      setError(`${response.error || 'Invalid token. Please try again.'} If this continues, press Reset 2FA and scan the QR code again.`);
      setStatus('');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-sm bg-gray-900 rounded-2xl p-8 border border-gray-800">
        <div className="text-center mb-8">
          <img
            src={settings.logoUrl}
            alt="Logo"
            width={180}
            height={72}
            className="h-16 w-auto object-contain mx-auto mb-4"
          />
          <h1 className="text-xl font-black text-white">Admin Panel</h1>
          <p className="text-gray-500 text-sm mt-1">PRIMECREST ENTERPRISE LTD</p>
        </div>

        {step === 'password' && (
          <form onSubmit={handlePasswordSubmit} className="space-y-4" autoComplete="off">
            {is2faChecking && (
              <p className="text-gray-400 text-xs text-center">Checking existing 2FA setup...</p>
            )}

            <div className="sr-only">
              <input type="text" name="username" autoComplete="username" value="" readOnly />
              <input type="password" name="password" autoComplete="current-password" value="" readOnly />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-400 mb-2">Admin Email</label>
              <input
                type="email"
                name="admin-email"
                autoComplete="off"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 text-sm"
                placeholder="Enter your admin email"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-400 mb-2">Admin Password</label>
              <input
                type="password"
                name="admin-password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 text-sm"
                placeholder="Enter admin password"
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 bg-orange-600 text-white font-bold rounded-lg hover:bg-orange-700 transition-colors cursor-pointer"
            >
              Continue
            </button>
          </form>
        )}

        {step === 'setup' && (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-gray-400 mb-4">
                Scan this QR code with <strong>Google Authenticator</strong>, <strong>Authy</strong>, or <strong>Microsoft Authenticator</strong>:
              </p>
              {qrCode && (
                <img
                  src={qrLoadFailed && otpauthUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUrl)}` : qrCode}
                  alt="QR Code"
                  className="w-48 h-48 mx-auto border-2 border-gray-700 rounded-lg p-2 bg-white"
                  onError={() => setQrLoadFailed(true)}
                />
              )}
              {qrLoadFailed && (
                <p className="text-xs text-orange-300 mt-2">
                  QR image failed to load. You can still use the manual key below.
                </p>
              )}
              <p className="text-xs text-gray-600 mt-3">Manual Key: {secret}</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-400 mb-2">Verify with 6-digit code</label>
              <input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 text-sm text-center tracking-widest"
                placeholder="000000"
              />
            </div>
            <button
              type="button"
              onClick={handleSetupConfirm}
              className="w-full py-3 bg-orange-600 text-white font-bold rounded-lg hover:bg-orange-700 transition-colors cursor-pointer"
            >
              Confirm Setup
            </button>
          </div>
        )}

        {step === 'verify' && (
          <div className="space-y-4">
            <form onSubmit={handleVerifyToken} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-2">Authenticator Code</label>
                <input
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 text-sm text-center tracking-widest"
                  placeholder="000000"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-orange-600 text-white font-bold rounded-lg hover:bg-orange-700 transition-colors cursor-pointer"
              >
                Verify and Access
              </button>
            </form>
          </div>
        )}

        {status && <p className="text-green-400 text-xs font-medium mt-3 text-center">{status}</p>}
        {error && <p className="text-red-400 text-xs font-medium mt-3 text-center">{error}</p>}
      </div>
    </div>
  );
}