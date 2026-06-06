Act as a Senior Software Architect. Scaffold a new empty Electron project named "${PROJECT_NAME}" that is an exact clone of the Aurum Bullion project's architecture, tech stack, and UI/UX standards, but with a specific focus on **Keyboard-First Interaction**.

### **Mandatory Configuration:**

1.  **Tech Stack:** Electron 28+, Vite 5, React 18 (TS), Tailwind 3.4, TypeORM 0.3 (SQLite), and Zustand.
2.  **Directory Structure:** Follow the DDD/Clean Architecture pattern (app/main, app/renderer, app/preload).

### **Keyboard-First Interaction Model (EXTENDED):**

- **Focus Navigation:**
  - Ensure all forms, buttons, and inputs have a logical `tabIndex` and visible focus rings (`focus:ring-2 focus:ring-primary`).
  - Modals must implement "Focus Trapping" (Tab stays within the modal until closed).
  - On mounting any form or modal, the first interactive element must **auto-focus**.
- **Global Hotkey Engine:**
  - Implement a `useHotkeys.ts` hook in `app/renderer/hooks` using a global `keydown` listener.
  - Standardize the following shortcuts:
    - `Ctrl/Cmd + N`: Create New (opens Register module/modal)
    - `Ctrl/Cmd + S`: Save/Submit current form
    - `Esc`: Cancel/Close modal or navigate back
    - `Ctrl/Cmd + F`: Trigger Search/Filter in lists
    - `Alt + 1..9`: Switch between top-level modules
- **Form UX:**
  - `Enter` key must submit the form or move to the next logical field.
  - Use `react-hook-form` to handle submission via the `Enter` key natively.
- **Traditional Mnemonic (Alt-Key) Navigation:**
  - **Top-Level:** Implement an `Alt + [Key]` listener where `[Key]` is the first letter of a Module (e.g., `Alt+I` for **I**nventory, `Alt+A` for **A**ccounting). Pressing this must trigger the menu
    dropdown.
  - **Visual Hints:** When `Alt` is held or a menu is open, the mnemonic letter must be **underlined** in the UI (e.g., <u>I</u>nventory). Use a `MnemonicLabel` component to handle this.
  - **Sub-Menu Navigation:** Once a dropdown is open, pressing the first letter of any sub-item (e.g., `P` for **P**arty Directory) must immediately trigger that action.

### **UI/UX Baseline:**

- **Visual Hints:** Add small keyboard shortcut badges (e.g., `[ ⌘S ]` or `[ Esc ]`) to buttons and tooltips to educate users.
- **Fintech Dark Aesthetic:** Background `#080e1a`, Surface `/80 backdrop-blur`, Border `border-white/10`.
- **Navigation:** Implement the `navigationStore` (Zustand) to handle module switching via both clicks and hotkeys.

### **Dynamic Theme System (NEW):**

    8 - **Architecture:** Implement a CSS-variable-based theme system using Tailwind's `darkMode: 'class'` strategy.
    9 - **Modes:**

10 - **Dark (Default):** Deep Navy background (`#080e1a`), Amber accents, glassmorphic surfaces.
11 - **Light:** Clean Slate/White background (`#f8fafc`), Deep Blue accents, subtle shadows instead of glows.
12 - **Persistence:** Use a `themeStore.ts` (Zustand) that persists the user's choice to `localStorage` and applies the `.dark` class to the `<html>` or `<body>` tag.
13 - **UI:** Provide a `ThemeToggle` component (Sun/Moon icons) with the shortcut `Ctrl/Cmd + T`.

### **Boilerplate Requirements:**

- **Database:** TypeORM DataSource with a sample entity.
- **IPC:** Strongly-typed bridge with a functional `useIpc` hook.
- **Scripts:** Port all `package.json` scripts (`dev`, `build`, `dist`).

### **Instructions:**

- **IMPORTANT:** Ask me for the `${PROJECT_NAME}` before generating any code.
- Do NOT include any Bullion or Jewelry specific logic.
- Ensure all files are strictly typed.Part 1: The Scaffolding PRD (Blueprint)

### Project Overview

- Goal: A production-grade Electron + React desktop application with a DDD (Domain-Driven Design) / Clean Architecture backend.
- Target Aesthetic: Modern "Fintech" UI; dark-themed by default with glassmorphism, crisp typography, and high-performance interactions.
- Naming Convention: ${PROJECT_NAME} (PascalCase for files, kebab-case for directories).

2. Technical Stack

- Runtime: Electron 28.1.0+
- Frontend: React 18 (TypeScript), Vite 5
- Backend/Main: Node.js (TypeScript), TypeORM 0.3 (SQLite3)
- Styling: Tailwind CSS 3.4 (with @tailwindcss/postcss setup), Lucide React Icons
- State Management: Zustand (Global stores), React Hook Form (Forms)
- Tools: Prettier, ESLint (strict TypeScript rules), Electron Builder (Distribution)

### Directory Structure (Mandatory)

    1 /
    2 ├── app/
    3 │   ├── main/                 # Backend (Main Process)
    4 │   │   ├── application/      # Use-Cases and DTOs
    5 │   │   ├── domain/           # Entities and Repository Interfaces
    6 │   │   ├── infrastructure/   # Database (TypeORM), Migrations, Repositories
    7 │   │   ├── interfaces/       # IPC Handlers (The "Controller" layer)
    8 │   │   └── index.ts          # Entry point (Bootstrap)
    9 │   ├── preload/              # IPC Bridge (contextBridge)

10 │ └── renderer/ # Frontend (Renderer Process)
11 │ ├── components/ # Shared UI components (Buttons, Modals, etc.)
12 │ ├── context/ # React Contexts (Confirmation, etc.)
13 │ ├── hooks/ # Custom hooks (useIpc, etc.)
14 │ ├── modules/ # Feature-based layouts and views
15 │ ├── store/ # Zustand state stores
16 │ └── App.tsx # UI Entry / Shell Layout
17 ├── build/ # Icons and Assets
18 └── dist/ # Build Output

4. Core Architectural Standards
1. IPC Security: contextIsolation: true, nodeIntegration: false. All communication must go through a strongly-typed window.electronAPI.
1. Use-Case Pattern: Every write operation must be a UseCase class in app/main/application/use-cases.
1. Data Persistence: SQLite managed via TypeORM Entities with automated schema synchronization for development and migrations for production.
1. UI Consistency:
   - Colors: Deep Navy backgrounds (#080e1a), Amber/Primary accents, Slate muted text.
   - Layout: 16px Top Bar, Sidebar or Top-Module Nav, 8px Footer with system status.
   - Interactions: All IPC calls must use the useIpc hook to handle loading, error, and success states consistently.

### **Mandatory Configuration:**

**Tech Stack:** Electron 28+, Vite 5, React 18, TypeScript 5, Tailwind CSS 3.4, TypeORM 0.3 (SQLite), and Zustand. 2.
**Directory Structure:** Follow the DDD/Clean Architecture pattern:

- `app/main`: {application/use-cases, domain/entities, infrastructure/database, interfaces/ipc/handlers.ts}
- `app/renderer`: {components, hooks/useIpc.ts, modules, store/navigationStore.ts, App.tsx}
- `app/preload`: Strongly-typed IPC bridge.

### **UI/UX Baseline:**

- Implement the "Fintech Dark" aesthetic: Background `#080e1a`, Surface `/80 backdrop-blur`, Border `border-white/10`.
- Use `lucide-react` for all icons.
- Create a global `App.tsx` layout with a Top Bar (Module Switcher), Content Area, and a Footer (System Status).
- Include the `useIpc` hook for standardized state management of backend calls.

### **Boilerplate Requirements (Empty but Functional):**

- **Database:** Initialize a TypeORM `DataSource` with a sample `AppSetting` entity to verify the DB works.
- **IPC:** Set up a `setupIpcHandlers` function in the main process and expose it through the preload bridge.
- **Theme:** Implement the `themeStore` (Zustand) and a theme toggle component.
- **Initialization:** Include a simplified `SetupWizard` module that runs if the database is empty.
- **Scripts & Build Process (MANDATORY):** 
  - Port all `package.json` scripts from the Bullion project.
  - Use manual `tsc` for `app/main` and `vite` for `app/renderer`.
  - Main process must be compiled to `dist/main` using `tsconfig.node.json`.
  - Renderer process must be compiled to `dist/renderer` using a standard `vite.config.ts`.
  - `package.json` must include the full `build` configuration (electron-builder) including `appId`, `productName`, and platform-specific settings.

### **Instructions:**

- Ask me for the `${PROJECT_NAME}` before starting.
- Do NOT include any Bullion or Jewelry specific logic.
- Ensure all files are strictly typed.
- Use separate `tsconfig.json` (renderer) and `tsconfig.node.json` (main) files.
- Match the exact linting and formatting rules (`.eslintrc`, `.prettierrc`) of the reference project.
