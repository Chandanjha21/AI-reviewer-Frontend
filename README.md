# AI Reviewer Frontend

This is the frontend application for the AI Reviewer platform, built with [Next.js](https://nextjs.org), React 19, and Tailwind CSS. It provides a user interface for managing leads, viewing analytics, and interacting with AI-driven reviews.

## Tech Stack

- **Framework:** [Next.js](https://nextjs.org/) (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **Icons:** [Lucide React](https://lucide.dev/)
- **Components:** [Radix UI](https://www.radix-ui.com/)
- **Charts:** [Recharts](https://recharts.org/)

## Prerequisites

Make sure you have [Node.js](https://nodejs.org/) (version 20+ recommended) installed on your system.

## Setup Instructions

1. **Clone the repository:**

   ```bash
   git clone <repository-url>
   cd AI-reviewer-Frontend
   ```

2. **Install dependencies:**

   You can use `npm`, `yarn`, `pnpm`, or `bun` to install the required packages.

   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   # or
   bun install
   ```

3. **Environment Variables:**

   Copy the `.env.example` file to `.env` in the root directory:

   ```bash
   cp .env.example .env
   ```

   Update the values in `.env` if necessary. By default, it expects the backend API at `http://localhost:8000`:
   ```env
   NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
   ```

4. **Run the development server:**

   Start the local development server. Note that it is configured to run on port `4321`.

   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   # or
   bun dev
   ```

5. **Open the application:**

   Open [http://localhost:4321](http://localhost:4321) with your browser to see the result.

## Building for Production

To create an optimized production build, run:

```bash
npm run build
# or
yarn build
```

Then, to start the production server:

```bash
npm run start
# or
yarn start
```

## Linting

To check for linting errors, run:

```bash
npm run lint
# or
yarn lint
```
