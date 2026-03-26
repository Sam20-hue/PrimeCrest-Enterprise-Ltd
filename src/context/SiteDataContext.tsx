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
  companyName: string;
  tagline: string;
  phone: string;
  email: string;
  address: string;
  aboutText: string;
  adminPassword: string;
  adminEmail: string;
  heroTitle: string;
  heroSubtitle: string;
  socialMedia: SocialMedia;
  mysqlApiUrl: string;
}

export interface Service {
  id: string;
  title: string;
  description: string;
  icon: string;
  image: string;
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
  author: string;
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

export interface Contact {
  id: number;
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
  updateSettings: (settings: SiteSettings) => void;
  setServices: (services: Service[]) => void;
  setGallery: (gallery: GalleryItem[]) => void;
  setBlogPosts: (posts: BlogPost[]) => void;
  setTestimonials: (t: Testimonial[]) => void;
  setTeam: (team: TeamMember[]) => void;
  setContacts: (contacts: Contact[]) => void;
  language: Lang;
  setLanguage: (lang: Lang) => void;
}

const defaultSettings: SiteSettings = {
  logoUrl: 'https://static.readdy.ai/image/2645941fdc0e183360970fc234d34970/773766d2f6ed38db8ecc7ecb533b68b7.jpeg',
  companyName: 'PRIMECREST ENTERPRISE LTD',
  tagline: 'Your Trusted Security & Technology Partner',
  phone: '+254 700 000 000',
  email: 'info@primecrest.co.ke',
  address: 'Nairobi, Kenya',
  aboutText: 'PRIMECREST ENTERPRISE LTD is a leading security and technology company providing comprehensive solutions across Kenya. With years of experience, we deliver professional CCTV installations, vault engineering, biometric systems, alarm installations, and IT infrastructure for banks, Saccos, businesses, and homes.',
  adminPassword: 'admin123',
  adminEmail: 'samsonakula3@gmail.com',
  heroTitle: 'Enterprise Security & Technology Solutions',
  heroSubtitle: 'CCTV • Vault Engineering • Biometric Systems • Alarm Systems • IT Solutions',
  socialMedia: {
    facebook: '',
    instagram: '',
    twitter: '',
    linkedin: '',
    whatsapp: '',
    youtube: '',
    tiktok: '',
  },
  mysqlApiUrl: 'http://localhost:3002',
};

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

const SiteDataContext = createContext<SiteDataContextType | null>(null);

export function SiteDataProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(() => {
    const stored = loadFromStorage<SiteSettings>('pc_settings', defaultSettings);
    return { ...defaultSettings, ...stored, socialMedia: { ...defaultSettings.socialMedia, ...(stored.socialMedia || {}) } };
  });
  const [services, setServicesState] = useState<Service[]>(() =>
    loadFromStorage('pc_services', mockServices)
  );
  const [gallery, setGalleryState] = useState<GalleryItem[]>(() =>
    loadFromStorage('pc_gallery', mockGalleryItems)
  );
  const [blogPosts, setBlogPostsState] = useState<BlogPost[]>(() =>
    loadFromStorage('pc_blog', mockBlogPosts)
  );
  const [testimonials, setTestimonialsState] = useState<Testimonial[]>(() =>
    loadFromStorage('pc_testimonials', mockTestimonials)
  );
  const [team, setTeamState] = useState<TeamMember[]>(() =>
    loadFromStorage('pc_team', mockTeam)
  );
  const [contacts, setContactsState] = useState<Contact[]>([]);
  const [language, setLanguageState] = useState<Lang>(() => {
    const stored = localStorage.getItem('pc_language') as Lang;
    const validLangs: Lang[] = ['en', 'fr', 'es', 'ar', 'de', 'pt'];
    return validLangs.includes(stored) ? stored : 'en';
  });

  const syncToApi = async (newSettings: SiteSettings, newServices: Service[], newGallery: GalleryItem[], newBlog: BlogPost[], newTestimonials: Testimonial[], newTeam: TeamMember[]) => {
    if (!newSettings?.mysqlApiUrl?.trim()) return;
    try {
      await mysqlService.syncAll({
        settings: newSettings,
        services: newServices,
        gallery: newGallery,
        blog: newBlog,
        products: [],
        testimonials: newTestimonials,
        team: newTeam,
      });
    } catch {
      // ignore sync failures (fallback on local storage)
    }
  };

  const updateSettings = (s: SiteSettings) => {
    setSettings(s);
    localStorage.setItem('pc_settings', JSON.stringify(s));
    syncToApi(s, services, gallery, blogPosts, testimonials, team);
  };

  const setServices = (s: Service[]) => {
    setServicesState(s);
    localStorage.setItem('pc_services', JSON.stringify(s));
    syncToApi(settings, s, gallery, blogPosts, testimonials, team);
  };

  const setGallery = (g: GalleryItem[]) => {
    setGalleryState(g);
    localStorage.setItem('pc_gallery', JSON.stringify(g));
    syncToApi(settings, services, g, blogPosts, testimonials, team);
  };

  const setBlogPosts = (p: BlogPost[]) => {
    setBlogPostsState(p);
    localStorage.setItem('pc_blog', JSON.stringify(p));
    syncToApi(settings, services, gallery, p, testimonials, team);
  };

  const setTestimonials = (t: Testimonial[]) => {
    setTestimonialsState(t);
    localStorage.setItem('pc_testimonials', JSON.stringify(t));
    syncToApi(settings, services, gallery, blogPosts, t, team);
  };

  const setTeam = (t: TeamMember[]) => {
    setTeamState(t);
    localStorage.setItem('pc_team', JSON.stringify(t));
    syncToApi(settings, services, gallery, blogPosts, testimonials, t);
  };

  const setContacts = (c: Contact[]) => {
    setContactsState(c);
  };

  const setLanguage = (lang: Lang) => {
    setLanguageState(lang);
    localStorage.setItem('pc_language', lang);
  };

  useEffect(() => {
    const stored = loadFromStorage('pc_settings', null as SiteSettings | null);
    const merged = { ...defaultSettings, ...stored, socialMedia: { ...defaultSettings.socialMedia, ...(stored?.socialMedia || {}) } };
    if (!stored || !stored.mysqlApiUrl?.trim()) {
      merged.mysqlApiUrl = 'http://localhost:3002';
      setSettings(merged);
      localStorage.setItem('pc_settings', JSON.stringify(merged));
    } else {
      // Ensure settings in localStorage also has all defaults
      localStorage.setItem('pc_settings', JSON.stringify(merged));
    }
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
        setServices,
        setGallery,
        setBlogPosts,
        setTestimonials,
        setTeam,
        setContacts,
        language,
        setLanguage,
      }}
    >
      {children}
    </SiteDataContext.Provider>
  );
}

export function useSiteData() {
  const ctx = useContext(SiteDataContext);
  if (!ctx) throw new Error('useSiteData must be used inside SiteDataProvider');
  return ctx;
}
