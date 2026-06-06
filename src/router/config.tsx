import { RouteObject } from 'react-router-dom';
import HomePage from '../pages/home/page';
import ServicesPage from '../pages/services/page';
import AboutPage from '../pages/about/page';
import GalleryPage from '../pages/gallery/page';
import BlogPage from '../pages/blog/page';
import BlogPostPage from '../pages/blog/PostPage';
import ServiceDetailPage from '../pages/services/ServiceDetail';
import ContactPage from '../pages/contact/page';
import AdminPage from '../pages/admin/page';
import NotFound from '../pages/NotFound';

const routes: RouteObject[] = [
  { path: '/', element: <HomePage /> },
  { path: '/services', element: <ServicesPage /> },
  { path: '/about', element: <AboutPage /> },
  { path: '/gallery', element: <GalleryPage /> },
  { path: '/services', element: <ServicesPage /> },
  { path: '/services/:id', element: <ServiceDetailPage /> },
  { path: '/blog', element: <BlogPage /> },
  { path: '/blog/:id', element: <BlogPostPage /> },
  { path: '/contact', element: <ContactPage /> },
  { path: '/admin', element: <AdminPage /> },
  { path: '*', element: <NotFound /> },
];

export default routes;