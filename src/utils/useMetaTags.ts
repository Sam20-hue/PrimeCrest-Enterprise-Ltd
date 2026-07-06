import { useEffect } from 'react';

interface MetaTagConfig {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
}

export const useMetaTags = (config: MetaTagConfig) => {
  useEffect(() => {
    // Set title
    if (config.title) {
      document.title = `${config.title} | Primecrest Enterprise LTD`;
    }

    // Remove existing meta tags
    const removeMetaTag = (name: string) => {
      const existing = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
      if (existing) existing.remove();
    };

    // Set description
    if (config.description) {
      removeMetaTag('description');
      removeMetaTag('og:description');
      
      const descTag = document.createElement('meta');
      descTag.name = 'description';
      descTag.content = config.description;
      document.head.appendChild(descTag);

      const ogDesc = document.createElement('meta');
      ogDesc.setAttribute('property', 'og:description');
      ogDesc.content = config.description;
      document.head.appendChild(ogDesc);
    }

    // Set OG image
    if (config.image) {
      removeMetaTag('og:image');
      const ogImage = document.createElement('meta');
      ogImage.setAttribute('property', 'og:image');
      ogImage.content = config.image;
      document.head.appendChild(ogImage);
    }

    // Set OG URL
    if (config.url) {
      removeMetaTag('og:url');
      const ogUrl = document.createElement('meta');
      ogUrl.setAttribute('property', 'og:url');
      ogUrl.content = config.url;
      document.head.appendChild(ogUrl);
    }

    // Set OG type
    if (config.type) {
      removeMetaTag('og:type');
      const ogType = document.createElement('meta');
      ogType.setAttribute('property', 'og:type');
      ogType.content = config.type;
      document.head.appendChild(ogType);
    }

    return () => {
      // Cleanup if needed
    };
  }, [config.title, config.description, config.image, config.url, config.type]);
};
