import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { mockServices } from '../mocks/services';
import { mysqlService } from '../services/mysqlService';
import { mockGalleryItems } from '../mocks/gallery';
import { mockBlogPosts } from '../mocks/blog';
import { mockTestimonials } from '../mocks/testimonials';
import { mockTeam } from '../mocks/team';
import type { Lang } from '../i18n/translations';

export interface SocialMedia {
  facebook: string;
  instagram: string;
  twitter: string;
  linkedin: string;
  whatsapp: string;
  youtube: string;
  tiktok: string;
}

export interface SiteSettings {
  logoUrl: string;
  logoWidth: number;
  logoHeight: number;
  logoAltText: string;
  logoDisplayMode: 'contain' | 'cover';
  logoContrast: number;
  logoSharpness?: number;
  logoBorderRadius: number;
  companyName: string;
  tagline: string;
  phone: string;
  email: string;
  address: string;
  aboutText: string;
  briefExplanation: string;
  adminPassword: string;
  adminEmail: string;
  heroTitle: string;
  heroSubtitle: string;
  socialMedia: SocialMedia;
  mysqlApiUrl: string;
  privacyPolicy: string;
  termsOfService: string;
}

export interface Service {
  id: string;
  title: string;
  description: string;
  details?: string;
  icon: string;
  image: string;
  images?: string[];
  imagesCaptions?: string[];
  features: string[];
}

export interface GalleryItem {
  id: string;
  title: string;
  category: string;
  imageUrl: string;
  description: string;
}

export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  date: string;
  category: string;
  imageUrl: string;
  images?: Array<{ url: string; description?: string }>;
  author: string;
  authorId?: string;
  published: boolean;
}

export interface Testimonial {
  id: string;
  text: string;
  name: string;
  company: string;
  industry: string;
  rating: number;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  imageUrl: string;
}

export interface Author {
  id: string;
  name: string;
  imageUrl: string;
  bio?: string;
  subtitle?: string;
  joinDate?: string;
  lastActive?: string;
  linkedIn?: string;
  upwork?: string;
}

export interface Contact {
  id: string | number;
  name: string;
  email: string;
  phone?: string;
  service?: string;
  message: string;
  created_at: string;
}

interface SiteDataContextType {
  settings: SiteSettings;
  services: Service[];
  gallery: GalleryItem[];
  blogPosts: BlogPost[];
  testimonials: Testimonial[];
  team: TeamMember[];
  contacts: Contact[];
  subscribers: string[];
  updateSettings: (settings: SiteSettings) => void;
  addSubscriber: (email: string) => Promise<boolean>;
  setServices: (services: Service[]) => void;
  setGallery: (gallery: GalleryItem[]) => void;
  setBlogPosts: (posts: BlogPost[]) => void;
  setTestimonials: (t: Testimonial[]) => void;
  setTeam: (team: TeamMember[]) => void;
  setContacts: (contacts: Contact[]) => void;
  setSubscribers: (emails: string[]) => void;
    authors: Author[];
    setAuthors: (authors: Author[]) => void;
  language: Lang;
  setLanguage: (lang: Lang) => void;
}

const defaultSettings: SiteSettings = {
  logoUrl: '/primecrest-logo.png',
  logoWidth: 360,
  logoHeight: 140,
  logoAltText: 'PRIMECREST ENTERPRISE LTD logo',
  logoDisplayMode: 'contain',
  logoContrast: 1.05,
  logoSharpness: 0,
  logoBorderRadius: 10,
  companyName: 'PRIMECREST ENTERPRISE LTD',
  tagline: 'Your Trusted Security & Technology Partner',
  email: 'info@primecrestenterprise.com',
  phone: '0721579821',
  address: 'Nairobi, Kenya',
  aboutText: 'PRIMECREST ENTERPRISE LTD is a leading security and technology company providing comprehensive solutions across Kenya. With years of experience, we deliver professional CCTV installations, vault engineering, biometric systems, alarm installations, and IT infrastructure for banks, Saccos, businesses, and homes.',
  briefExplanation: 'Professional security and technology solutions tailored to your business needs. From concept to installation, we deliver excellence.',
  adminPassword: 'admin123',
  adminEmail: 'samsonakula3@gmail.com',
  heroTitle: 'Enterprise Security & Technology Solutions',
  heroSubtitle: 'CCTV • Vault Engineering • Biometric Systems • Alarm Systems • IT Solutions',
  privacyPolicy: 'We respect your privacy. Your contact details are used only to deliver requested updates, respond to inquiries, and improve our services.',
  termsOfService: 'By using this site, you agree to our terms of service. We provide security solutions with professional care and responsible handling of your data.',
  socialMedia: {
    facebook: '',
    instagram: '',
    twitter: '',
    linkedin: '',
    whatsapp: '',
    youtube: '',
    tiktok: '',
  },
  mysqlApiUrl: '',
};

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function safeString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function safeNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' ? value : fallback;
}

function parseJsonArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) {
    return value as T[];
  }
  if (typeof value !== 'string') {
    return [];
  }
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function normalizeSocialMedia(value: unknown): SocialMedia {
  const stored = typeof value === 'object' && value !== null ? (value as Partial<SocialMedia>) : {};
  return {
    facebook: safeString(stored.facebook, defaultSettings.socialMedia.facebook),
    instagram: safeString(stored.instagram, defaultSettings.socialMedia.instagram),
    twitter: safeString(stored.twitter, defaultSettings.socialMedia.twitter),
    linkedin: safeString(stored.linkedin, defaultSettings.socialMedia.linkedin),
    whatsapp: safeString(stored.whatsapp, defaultSettings.socialMedia.whatsapp),
    youtube: safeString(stored.youtube, defaultSettings.socialMedia.youtube),
    tiktok: safeString(stored.tiktok, defaultSettings.socialMedia.tiktok),
  };
}

function normalizeService(value: unknown): Service {
  const stored = typeof value === 'object' && value !== null ? (value as Partial<Service>) : {};
  return {
    id: safeString(stored.id, `${Date.now()}`),
    title: safeString(stored.title, ''),
    description: safeString(stored.description, ''),
    details: safeString(stored.details, ''),
    icon: safeString(stored.icon, 'ri-tools-line'),
    image: safeString(stored.image ?? stored.imageUrl, ''),
    images: parseJsonArray<string>(stored.images).filter((item): item is string => typeof item === 'string'),
    imagesCaptions: parseJsonArray<string>(stored.imagesCaptions).filter((item): item is string => typeof item === 'string'),
    features: Array.isArray(stored.features) ? stored.features.filter((item): item is string => typeof item === 'string') : [],
  };
}

function normalizeGalleryItem(value: unknown): GalleryItem {
  const stored = typeof value === 'object' && value !== null ? (value as Partial<GalleryItem>) : {};
  return {
    id: safeString(stored.id, `${Date.now()}`),
    title: safeString(stored.title, ''),
    category: safeString(stored.category, ''),
    imageUrl: safeString(stored.imageUrl, ''),
    description: safeString(stored.description, ''),
  };
}

function normalizeBlogPost(value: unknown): BlogPost {
  const stored = typeof value === 'object' && value !== null ? (value as Partial<BlogPost>) : {};
  const rawImages = parseJsonArray<unknown>(stored.images);
  return {
    id: safeString(stored.id, `${Date.now()}`),
    title: safeString(stored.title, ''),
    excerpt: safeString(stored.excerpt, ''),
    content: safeString(stored.content, ''),
    date: safeString(stored.date, new Date().toISOString().split('T')[0]),
    category: safeString(stored.category, ''),
    imageUrl: safeString(stored.imageUrl, ''),
    images: rawImages
      .filter((item): item is { url: string; description?: string } => typeof item === 'object' && item !== null && 'url' in item)
      .map((item) => ({ url: (item as any).url, description: (item as any).description })),
    author: safeString(stored.author, ''),
    authorId: safeString(stored.authorId, ''),
    published: Boolean(stored.published),
  };
}

function isLocalhostApiUrl(url: string | undefined): boolean {
  if (!url) return false;
  return /^(?:https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?(?:\/.*)?$/i.test(url.trim());
}

function normalizeSettings(stored: Partial<SiteSettings>): SiteSettings {
  return {
    ...defaultSettings,
    ...stored,
    socialMedia: {
      ...defaultSettings.socialMedia,
      ...(stored.socialMedia || {}),
    },
  };
}

const SiteDataContext = createContext<SiteDataContextType | null>(null);

export function SiteDataProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(() => {
    const stored = loadFromStorage<Partial<SiteSettings>>('pc_settings', {});
    return normalizeSettings(stored);
  });
  const [services, setServicesState] = useState<Service[]>(() =>
    loadFromStorage('pc_services', [] as Service[])
  );
  const [gallery, setGalleryState] = useState<GalleryItem[]>(() =>
    loadFromStorage('pc_gallery', [] as GalleryItem[])
  );
  const [blogPosts, setBlogPostsState] = useState<BlogPost[]>(() =>
    loadFromStorage('pc_blog', [] as BlogPost[])
  );
  const [testimonials, setTestimonialsState] = useState<Testimonial[]>(() =>
    loadFromStorage('pc_testimonials', [] as Testimonial[])
  );
  const [team, setTeamState] = useState<TeamMember[]>(() =>
    loadFromStorage('pc_team', [] as TeamMember[])
  );
  const [contacts, setContactsState] = useState<Contact[]>([]);
  const [subscribers, setSubscribersState] = useState<string[]>(() => loadFromStorage('pc_subscribers', []));
  const [language, setLanguageState] = useState<Lang>(() => {
    const stored = localStorage.getItem('pc_language') as Lang;
    const validLangs: Lang[] = ['en', 'fr', 'es', 'ar', 'de', 'pt'];
    return validLangs.includes(stored) ? stored : 'en';
  });
  const [authors, setAuthorsState] = useState<Author[]>(() => loadFromStorage('pc_authors', [] as Author[]));

  const syncToApi = async (
    newSettings: SiteSettings,
    newServices: Service[],
    newGallery: GalleryItem[],
    newBlog: BlogPost[],
    newTestimonials: Testimonial[],
    newTeam: TeamMember[],
    newAuthors: Author[],
    newSubscribers: string[]
  ) => {
    try {
      await mysqlService.syncAll({
        settings: newSettings,
        services: newServices,
        gallery: newGallery,
        blog: newBlog,
        authors: newAuthors,
        team: newTeam,
        products: [],
        testimonials: newTestimonials,
        subscribers: newSubscribers,
      });
    } catch {
      // ignore sync failures (fallback on local storage)
    }
  };

  const updateSettings = (s: SiteSettings) => {
    setSettings(s);
    localStorage.setItem('pc_settings', JSON.stringify(s));
    // Persist settings via API PUT /api/settings when possible; fall back to full sync
    (async () => {
      try {
        // Send only textual/customizable fields to the settings endpoint.
        const imagePattern = /logo|image|photo|avatar/i;
        const textPayload: any = {};
        for (const [k, v] of Object.entries(s)) {
          if (!imagePattern.test(k)) textPayload[k] = v;
        }

        const res = await mysqlService.updateSettings(textPayload);
        if (!res.ok) {
          // fallback to syncAll which writes full payload (file-fallback supports /api/sync)
          await mysqlService.syncAll({ settings: s, services, gallery, blog: blogPosts, authors, team, products: [], testimonials, subscribers });
        }
      } catch {
        try {
          await mysqlService.syncAll({ settings: s, services, gallery, blog: blogPosts, authors, team, products: [], testimonials, subscribers });
        } catch {
          // ignore
        }
      }
    })();
  };

  const addSubscriber = async (email: string): Promise<boolean> => {
    const normalized = email.trim().toLowerCase();
    if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      return false;
    }
    if (subscribers.includes(normalized)) {
      return false;
    }
    const updated = [normalized, ...subscribers];
    setSubscribersState(updated);
    localStorage.setItem('pc_subscribers', JSON.stringify(updated));

    try {
      const result = await mysqlService.subscribeEmail({ email: normalized });
      if (!result.ok) {
        console.warn('[SiteData] subscribeEmail failed:', result.error);
      }
    } catch (err) {
      console.warn('[SiteData] subscribeEmail threw:', err);
    }

    return true;
  };

  const setServices = (s: Service[]) => {
    setServicesState(s);
    localStorage.setItem('pc_services', JSON.stringify(s));
    syncToApi(settings, s, gallery, blogPosts, testimonials, team, authors, subscribers);
  };

  const setGallery = (g: GalleryItem[]) => {
    setGalleryState(g);
    localStorage.setItem('pc_gallery', JSON.stringify(g));
    syncToApi(settings, services, g, blogPosts, testimonials, team, authors, subscribers);
  };

  const setBlogPosts = (p: BlogPost[]) => {
    setBlogPostsState(p);
    localStorage.setItem('pc_blog', JSON.stringify(p));
    syncToApi(settings, services, gallery, p, testimonials, team, authors, subscribers);
  };

  const setTestimonials = (t: Testimonial[]) => {
    setTestimonialsState(t);
    localStorage.setItem('pc_testimonials', JSON.stringify(t));
    syncToApi(settings, services, gallery, blogPosts, t, team, authors, subscribers);
  };

  const setTeam = (t: TeamMember[]) => {
    setTeamState(t);
    localStorage.setItem('pc_team', JSON.stringify(t));
    syncToApi(settings, services, gallery, blogPosts, testimonials, t, authors, subscribers);
  };

  const setContacts = (c: Contact[]) => {
    setContactsState(c);
  };

  const setSubscribers = (emails: string[]) => {
    setSubscribersState(emails);
    localStorage.setItem('pc_subscribers', JSON.stringify(emails));
    syncToApi(settings, services, gallery, blogPosts, testimonials, team, authors, emails);
  };

  const setAuthors = (a: Author[]) => {
    setAuthorsState(a);
    localStorage.setItem('pc_authors', JSON.stringify(a));
    // Sync authors to backend
    try {
      syncToApi(settings, services, gallery, blogPosts, testimonials, team, a, subscribers);
    } catch {
      // ignore sync failures (fallback on local storage)
    }
  };

  const setLanguage = (lang: Lang) => {
    setLanguageState(lang);
    localStorage.setItem('pc_language', lang);
  };

  useEffect(() => {
    const stored = loadFromStorage('pc_settings', null as SiteSettings | null);
    const merged = {
      ...defaultSettings,
      ...stored,
      socialMedia: { ...defaultSettings.socialMedia, ...(stored?.socialMedia || {}) },
    };
    const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    if (
      !stored ||
      !stored.mysqlApiUrl?.trim() ||
      (currentHost !== 'localhost' && currentHost !== '127.0.0.1' && isLocalhostApiUrl(stored.mysqlApiUrl))
    ) {
      merged.mysqlApiUrl = '';
    }
    setSettings(merged);
    localStorage.setItem('pc_settings', JSON.stringify(merged));
  }, []);

  function shouldApplyRemoteCollection<T>(remoteData: unknown, localStorageKey: string, fallback: T[]): remoteData is T[] {
    if (!Array.isArray(remoteData)) {
      return false;
    }
    const localData = loadFromStorage<T[]>(localStorageKey, fallback);
    return remoteData.length > 0 || localData.length === 0;
  }

  function hasMeaningfulRemoteSettings(remoteSettingsData: Partial<SiteSettings> | null): remoteSettingsData is Partial<SiteSettings> {
    if (!remoteSettingsData) return false;
    return Object.entries(remoteSettingsData).some(
      ([key, value]) => key in defaultSettings && value !== null && value !== ''
    );
  }

  useEffect(() => {
    const loadRemoteData = async () => {
      const settingsRes = await mysqlService.getSettings();
      const remoteSettingsData =
        settingsRes.ok &&
        settingsRes.data &&
        typeof settingsRes.data === 'object' &&
        !Array.isArray(settingsRes.data)
          ? (settingsRes.data as Partial<SiteSettings>)
          : null;

      if (hasMeaningfulRemoteSettings(remoteSettingsData)) {
        const remoteSettings = {
          ...defaultSettings,
          ...remoteSettingsData,
          socialMedia: {
            ...defaultSettings.socialMedia,
            ...(remoteSettingsData.socialMedia || {}),
          },
        };
        setSettings(remoteSettings);
        localStorage.setItem('pc_settings', JSON.stringify(remoteSettings));
      }

      const servicesRes = await mysqlService.getServices();
      if (servicesRes.ok && Array.isArray(servicesRes.data)) {
        const normalizedServices = servicesRes.data.map(normalizeService);
        if (shouldApplyRemoteCollection<Service>(normalizedServices, 'pc_services', mockServices)) {
          setServicesState(normalizedServices);
          localStorage.setItem('pc_services', JSON.stringify(normalizedServices));
        }
      }

      const galleryRes = await mysqlService.getGallery();
      if (shouldApplyRemoteCollection<GalleryItem>(galleryRes.data, 'pc_gallery', [])) {
        const normalizedGallery = (galleryRes.data as unknown[]).map(normalizeGalleryItem);
        setGalleryState(normalizedGallery);
        localStorage.setItem('pc_gallery', JSON.stringify(normalizedGallery));
      }

      const blogRes = await mysqlService.getBlogPosts();
      // Only apply remote blog posts when the remote data is meaningful or the
      // local storage is empty. Use an empty fallback to avoid showing dev mocks.
      if (shouldApplyRemoteCollection<BlogPost>(blogRes.data, 'pc_blog', [])) {
        const normalizedBlogPosts = (blogRes.data as unknown[]).map(normalizeBlogPost);
        setBlogPostsState(normalizedBlogPosts);
        localStorage.setItem('pc_blog', JSON.stringify(normalizedBlogPosts));
      }

      const testimonialsRes = await mysqlService.getTestimonials();
      if (shouldApplyRemoteCollection<Testimonial>(testimonialsRes.data, 'pc_testimonials', [])) {
        setTestimonialsState(testimonialsRes.data as Testimonial[]);
        localStorage.setItem('pc_testimonials', JSON.stringify(testimonialsRes.data));
      }

      const teamRes = await mysqlService.getTeam();
      if (shouldApplyRemoteCollection<TeamMember>(teamRes.data, 'pc_team', mockTeam)) {
        setTeamState(teamRes.data as TeamMember[]);
        localStorage.setItem('pc_team', JSON.stringify(teamRes.data));
      }

      const authorsRes = await mysqlService.getAuthors();
      if (shouldApplyRemoteCollection<Author>(authorsRes.data, 'pc_authors', mockAuthors)) {
        setAuthorsState(authorsRes.data as Author[]);
        localStorage.setItem('pc_authors', JSON.stringify(authorsRes.data));
      }

      const subscribersRes = await mysqlService.getSubscribers();
      if (subscribersRes.ok && Array.isArray(subscribersRes.data)) {
        const remoteSubscribers = subscribersRes.data.filter((item) => typeof item === 'string');
        if (remoteSubscribers.length > 0) {
          setSubscribersState(remoteSubscribers);
          localStorage.setItem('pc_subscribers', JSON.stringify(remoteSubscribers));
        }
      }
    };

    loadRemoteData().catch((error) => {
      console.warn('[SiteData] loadRemoteData failed:', error);
    });
  }, []);

  return (
    <SiteDataContext.Provider
      value={{
        settings,
        services,
        gallery,
        blogPosts,
        testimonials,
        team,
        contacts,
        updateSettings,
        addSubscriber,
        setServices,
        setGallery,
        setBlogPosts,
        setTestimonials,
        setTeam,
        setContacts,
        subscribers,
        setSubscribers,
        language,
        setLanguage,
        authors,
        setAuthors,
      }}
    >
      {children}
    </SiteDataContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSiteData() {
  const ctx = useContext(SiteDataContext);
  if (!ctx) throw new Error('useSiteData must be used inside SiteDataProvider');
  return ctx;
}
