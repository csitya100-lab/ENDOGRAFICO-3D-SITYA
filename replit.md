# 3D Uterus Visualizer

## Overview

A medical visualization application for mapping endometriosis lesions using interactive 3D and 2D views. The system enables healthcare professionals to visualize anatomical structures, place lesion markers with severity classifications, and annotate views with drawing tools. This tool aims to enhance diagnostic accuracy and improve patient outcomes by providing a comprehensive and intuitive platform for medical imaging analysis.

## User Preferences

Preferred communication style: Simple, everyday language (Portuguese).
Menu sidebar: Uses short labels "3D" and "2D" instead of full descriptive names for navigation items.
Minimalist UI: Removed thickness slider, export buttons, and unnecessary features.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Routing**: Wouter
- **State Management**: TanStack React Query (server state), Zustand (3D lesion synchronization, report images), React hooks (local state)
- **UI Components**: shadcn/ui (built on Radix UI primitives)
- **Styling**: Tailwind CSS v4 with CSS custom properties
- **3D Rendering**: Three.js with OrbitControls and GLTFLoader
- **UI/UX Decisions**:
    - **Toast Notifications**: Replaced `alert()` with sonner toast notifications (success, warning, error) including undo functionality.
    - **Sidebar Navigation**: Flow progress indicator (3D → 2D → Relatório), badge with lesion count, accessibility improvements.
    - **Toolbar 3D**: Reorganized with navigation/marking mode toggle, grouped buttons, and visual separators.
    - **Anatomy Panel**: Elements grouped by category with icons, improved hover/active states.
    - **Landing Page**: Enhanced CTA, CSS animations, professional subtitle badge.
    - **2D Tools**: Active tool highlighting, compact toolbar (no labels, no preview section).
    - **Report Drag-and-Drop**: Improved visual feedback and instructions.
    - **Unified Color Palette**: Neutral slate/gray base + rose as primary accent. Action buttons use outline style; only main CTA (Relatório) uses rose fill. Landing page icons use rose on slate background instead of multi-color gradients.
    - **Dark Mode**: Consistent dark mode support across all pages.
    - **3D Visual Configuration**: Scene background (dark slate), 5 light sources (ambient, directional, fill, pink point, purple rim), material colors from medical guide, PBR materials with clearcoat (desktop only).
    - **5-View 3D Layout**: Changed to a 3-column 2-row grid, including a new Sagittal DIR→ESQ view.
    - **2D Fullscreen Mode**: Fullscreen button on each 2D view card with dedicated toolbar and drawing tools.
    - **Ruler Tool**: Manual input for measurement in mm after drawing the line.
    - **Page Transitions**: React.lazy() + Suspense for routes with fade + slide animations.

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ESM modules
- **API Design**: Minimal; server serves static files and applies rate limiting to `/api/` for future use. No AI or report-text generation.

### Data Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect (for future user management).
- **Current Storage**: In-memory storage (`MemStorage`) for development, sessionStorage for client-side persistence of lesions and report images.

### Key Design Patterns
- **Shared Types**: `shared/` directory for client/server schemas.
- **Path Aliases**: `@/` for client source, `@shared/` for shared code.
- **Component Architecture**: Reusable UI components.
- **Page-based Routing**: Pages map to routes.

### Application Pages
1. **Landing** (`/`): Initial page with instructions and navigation.
2. **Home/3D** (`/3d`): Main 3D visualization interface with lesion controls and synchronized 4-view perspectives.
    - Features 3D captures, per-view 2D captures, and HTML export.
3. **Vistas 2D** (`/vistas-2d`): Independent 2D views editor with comprehensive drawing and annotation tools.
4. **Preview Report** (`/preview-report`): Report preview with captured images, observations, and PDF export.
5. **Relatório Público** (`/relatorio/:id`): Publicly shareable report page with interactive 3D model, 2D views, and lesion summary.

### 3D Module Architecture
- **Shared Modules**: `modelLoader.ts` (IndexedDB caching, device detection), `anatomyCreator.ts` (programmatic anatomy), `meshAnalyzer.ts` (GLB processing, material application).
- **Mobile Optimizations**: Reduced pixel ratio, disabled shadows, MeshStandardMaterial, disabled clearcoat on mobile/iOS.
- **Loading UX**: Progress indicator, timeout with fallback model, error overlay, IndexedDB caching.
- **Lesion Rendering**: `updateAllMarkers()` called after model load.

### HTML Export System
- Uses ES Modules via unpkg CDN for Three.js, with import maps and embedded base64 model/lesion data for self-contained HTML.

### 3D Interaction System
- **Mouse Button Rules**: Left click for lesion interaction (select, create, drag), right click for camera orbit (3D) or lesion insertion (2D).
- **View-Specific Behavior**: 3D perspective allows lesion creation/selection with left-click and camera orbit with right-click. 2D views insert lesions with right-click and select/drag with left-click.
- **Double-Click**: Deletes lesions.

### Critical Architecture Rules
- **Vistas2D is INDEPENDENT**: No lesion sync between 2D views.
- Canvas2D uses dual layers: main canvas for background/lesions, drawingCanvas for annotations.

### 2D Views System
- **Projection Functions**: `shared/3d/projections.ts` for 3D<->2D coordinate transformations.
- **Canvas2D Component**: Interactive dual-layer canvas with drawing preservation.
- **Drawing Tools**: Select, Pen, Eraser, Line, Circle, Filled Circle, Text tools with customizable properties.
- **Focus System**: Checkbox selection amplifies a 2D view to 70% screen width.

## External Dependencies

### Key NPM Packages
- `three`: 3D graphics rendering.
- `@tanstack/react-query`: Asynchronous state management.
- `zustand`: Lightweight state management.
- `drizzle-orm` / `drizzle-zod`: Database ORM with Zod integration.
- `@radix-ui/*`: Accessible UI primitives.
- `zod`: Runtime type validation.

### Escopo do produto (sem IA diagnóstica)
- **Foco:** Geração e visualização de **modelos gráficos** onde são inseridas e demonstradas as **lesões e suas localizações**. Não há interpretação nem geração de texto para relatório por IA.
- **Comentários em texto:** Quando forem necessários, são sempre redigidos pelo profissional (campos de observação no app).
- **Raciocínio diagnóstico:** Não existe neste momento nenhum raciocínio ou sugestão diagnóstica por IA.

### API Review (uso real e necessidade)
- **Auth:** Rotas em `server/replit_integrations/auth/routes.ts` (`GET /api/auth/user`) **não estão registradas** — `registerAuthRoutes()` não é chamado em `server/index.ts`. O cliente tem `auth-utils.ts` (redirect para `/api/login`, `isUnauthorizedError`) mas **não importa** essas funções em nenhum lugar. **Necessidade:** ou registrar auth e usar login/usuário, ou remover o código de auth e auth-utils se não for usado.
- **Cliente:** `apiRequest` e `getQueryFn` em `queryClient.ts` existem para chamadas HTTP; **nenhum `useQuery`/`useMutation`** chama nenhuma API. React Query está configurado mas sem consumo de API atualmente.

### Sugestão — Auth: usar ou remover
- **Usar auth:** Em `server/index.ts` chamar `registerAuthRoutes(app)`; no cliente usar `useQuery` para `GET /api/auth/user` e, em 401, `redirectToLogin(toast)`.
- **Remover auth:** Não registrar `registerAuthRoutes`; opcionalmente remover `auth/routes.ts` e `auth-utils.ts`. Sem login (uso local/anónimo) → remover. Com utilizadores identificados → usar.

### Supabase Configuration
- **Environment Variables**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
- **Database Schema**: `cases` table with `id`, `patient_name`, `exam_date`, `lesions` (JSONB), `created_at`.
- **Row Level Security (RLS)**: Policies enable anonymous insert and select for cases, blocking updates and deletes.