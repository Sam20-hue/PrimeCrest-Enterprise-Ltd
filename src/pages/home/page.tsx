import HeroSection from './components/HeroSection';
import ServicesPreview from './components/ServicesPreview';
import BriefExplanationSection from './components/BriefExplanationSection';
import ProcessSection from './components/ProcessSection';
import TestimonialsSection from './components/TestimonialsSection';
import CtaBanner from './components/CtaBanner';
import GalleryPreview from './components/GalleryPreview';

export default function HomePage() {
  return (
    <main>
      <HeroSection />
      <ServicesPreview />
      <BriefExplanationSection />
      <ProcessSection />
      <GalleryPreview />
      <TestimonialsSection />
      <CtaBanner />
    </main>
  );
}