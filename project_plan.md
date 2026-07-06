# PRIMECREST ENTERPRISE LTD - Company Website

## 1. Project Description
Corporate website for PRIMECREST ENTERPRISE LTD, a security and technology company offering CCTV installation, vault/safe engineering, bank/Saccos strong door installation, alarm & biometric systems, and computer software/hardware engineering. The site targets businesses and institutions (banks, Saccos, offices) seeking professional security and technology solutions.

## 2. Page Structure
- `/` - Home (hero, services preview, stats, process, testimonials)
- `/services` - Services (detailed service cards)
- `/about` - About Us (company story, team, values)
- `/gallery` - Gallery (project photos by category)
- `/blog` - Blog (articles and updates)
- `/products` - Products (catalog with categories)
- `/contact` - Contact (form, map, details)
- `/admin` - Admin Panel (protected, CRUD for all content)

## 3. Core Features
- [x] Multi-page navigation (Home, Services, About, Gallery, Blog, Products, Contact, Language)
- [x] Admin panel at /admin (no public link, access by direct URL)
- [x] Admin: upload/change company logo
- [x] Admin: manage services (add/edit/delete)
- [x] Admin: manage gallery items (add/edit/delete)
- [x] Admin: manage blog posts (add/edit/delete)
- [x] Admin: manage products (add/edit/delete)
- [x] Admin: manage site settings (contact info, about text)
- [x] Language switcher (English / Swahili)
- [x] Contact form
- [x] Default images with admin override capability

## 4. Data Model Design
All data stored in localStorage (no backend required):

### siteSettings
| Field | Type | Description |
|-------|------|-------------|
| logoUrl | string | Company logo image URL |
| companyName | string | Company name |
| tagline | string | Company tagline |
| phone | string | Contact phone |
| email | string | Contact email |
| address | string | Physical address |
| aboutText | string | About company description |
| adminPassword | string | Admin access password |

### services[]
| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique ID |
| title | string | Service name |
| description | string | Service details |
| icon | string | Remix icon class |
| image | string | Image URL |
| features | string[] | Feature bullet points |

### galleryItems[]
| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique ID |
| title | string | Project title |
| category | string | Category label |
| imageUrl | string | Image URL |
| description | string | Short description |

### blogPosts[]
| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique ID |
| title | string | Post title |
| excerpt | string | Short summary |
| content | string | Full content |
| date | string | Publish date |
| category | string | Post category |
| imageUrl | string | Cover image URL |
| author | string | Author name |

### products[]
| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique ID |
| title | string | Product name |
| description | string | Product details |
| price | string | Price or "Request Quote" |
| category | string | Product category |
| imageUrl | string | Product image URL |
| features | string[] | Key features |

## 5. Backend / Third-party Integration Plan
- PHP backend only: Deploy `php-backend/api/` and do not use Node.js for backend deployment
- Supabase: Not needed (localStorage for all data)
- Shopify: Not needed
- Stripe: Not needed

## 6. Development Phase Plan

### Phase 1: Foundation + Home Page
- Goal: Setup routing, shared components (Navbar, Footer), data context, Home page
- Deliverable: Fully working homepage with professional design

### Phase 2: Service Content Pages
- Goal: Services, About, Contact, Gallery pages
- Deliverable: All main content pages complete

### Phase 3: Blog & Products Pages
- Goal: Blog and Products pages with mock data
- Deliverable: Blog and Products pages complete

### Phase 4: Admin Panel
- Goal: Full admin panel with CRUD for all content sections
- Deliverable: Working admin panel at /admin

### Phase 5: Language Support
- Goal: English / Swahili language toggle
- Deliverable: Site translatable between EN and SW
