import { useSiteData } from '../../context/SiteDataContext';
import { translations, Lang } from '../../i18n/translations';

interface LanguageModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface LangOption {
  code: Lang;
  label: string;
  nativeName: string;
  flag: string;
}

// English is first now
const langOptions: LangOption[] = [
  { code: 'en', label: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'fr', label: 'Français', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'es', label: 'Español', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'ar', label: 'العربية', nativeName: 'Arabic', flag: '🇸🇦' },
  { code: 'de', label: 'Deutsch', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'pt', label: 'Português', nativeName: 'Português', flag: '🇵🇹' },
];

export default function LanguageModal({ isOpen, onClose }: LanguageModalProps) {
  const { language, setLanguage } = useSiteData();
  const title = translations[language]?.language_modal?.title || 'Select Language';

  if (!isOpen) return null;

  const handleSelect = (lang: Lang) => {
    setLanguage(lang);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-8 w-[400px] shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-black text-gray-900">{title}</h3>
            <p className="text-xs text-gray-400 mt-0.5">Choose your preferred language</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 cursor-pointer"
          >
            <i className="ri-close-line text-gray-500" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-2">
          {langOptions.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleSelect(lang.code)}
              className={`w-full flex items-center gap-4 p-3.5 rounded-xl border-2 transition-all cursor-pointer text-left ${
                language === lang.code
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-gray-100 hover:border-orange-300 hover:bg-orange-50/40'
              }`}
            >
              <span className="text-2xl w-8 text-center flex-shrink-0">{lang.flag}</span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 text-sm">{lang.label}</p>
                <p className="text-xs text-gray-400">{lang.nativeName}</p>
              </div>
              {language === lang.code && (
                <span className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                  <i className="ri-checkbox-circle-fill text-orange-500 text-xl" />
                </span>
              )}
            </button>
          ))}
        </div>

        <p className="text-center text-xs text-gray-400 mt-5">
          The entire website will switch to your selected language
        </p>
      </div>
    </div>
  );
}
