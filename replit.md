# Website Grader

## Overview

This is an AI-powered website analysis tool that provides comprehensive scoring and recommendations across four key pillars: accessibility, trust & security, performance, and agent readiness. The system uses Google's Gemini AI to analyze websites and generate actionable insights for improvement. Built as a full-stack application with a React frontend and Express backend, it features automated scanning capabilities using Playwright, Lighthouse, and axe-core for thorough website auditing.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **React + TypeScript**: Modern component-based UI built with React 18 and TypeScript for type safety
- **Vite**: Fast build tool and development server with HMR support
- **Shadcn/ui + Tailwind CSS**: Component library built on Radix UI primitives with Tailwind for styling
- **React Hook Form + Zod**: Form handling with runtime validation schemas
- **TanStack Query**: Server state management with caching and synchronization
- **Wouter**: Lightweight client-side routing

### Backend Architecture
- **Express.js**: RESTful API server handling scan orchestration and data management
- **Node.js**: Runtime environment enabling consistent JavaScript across frontend and backend
- **Drizzle ORM**: Type-safe database operations with PostgreSQL
- **Structured API**: Clear separation between routes, storage, and scanning logic

### Scanning Engine
- **Playwright**: Headless browser automation for page interaction and screenshot capture
- **Axe-core**: Automated accessibility testing with WCAG compliance checking
- **Lighthouse**: Performance auditing and Core Web Vitals measurement
- **Custom Security Scanner**: HTTP header analysis and policy detection
- **Agent Readiness Checker**: SEO, structured data, and crawlability assessment

### AI Integration
- **Google Gemini**: AI analysis using the official Google GenAI SDK
- **Structured JSON Responses**: Enforced response schemas for consistent AI output
- **Multi-pillar Analysis**: AI-powered scoring and recommendation generation across all audit areas

### Data Storage
- **PostgreSQL**: Primary database with Neon serverless hosting
- **Comprehensive Schema**: Tables for scans, results, reports, evidence, and users
- **Foreign Key Relationships**: Proper data integrity with relational design
- **JSON Storage**: Flexible storage for raw audit data and AI analysis results

### Architecture Patterns
- **Monorepo Structure**: Frontend, backend, and shared code in unified repository
- **Shared Types**: Common TypeScript interfaces between client and server
- **Asynchronous Processing**: Background scan execution with status tracking
- **Component-based UI**: Reusable React components with consistent design system

## External Dependencies

### AI and Analysis Services
- **Google Gemini API**: Core AI analysis engine for generating insights and recommendations
- **PageSpeed Insights API**: Google's performance measurement and optimization suggestions
- **Chrome User Experience Report (CrUX)**: Real-world performance data from Chrome users

### Development and Hosting
- **Neon Database**: Serverless PostgreSQL hosting with automatic scaling
- **Replit**: Development environment and deployment platform with integrated tooling

### Browser Automation
- **Playwright**: Cross-browser testing framework for comprehensive page analysis
- **Puppeteer**: Additional browser automation for Lighthouse integration
- **Axe-core**: Industry-standard accessibility testing engine

### UI and Styling
- **Radix UI**: Headless component primitives for accessible UI foundation
- **Tailwind CSS**: Utility-first CSS framework with custom design system
- **Lucide React**: Consistent icon library for interface elements

### Form and State Management
- **React Hook Form**: Performant form handling with minimal re-renders
- **Zod**: Runtime type validation for form inputs and API responses
- **TanStack Query**: Advanced data fetching with caching and background updates

### Build and Development Tools
- **Vite**: Modern build tool with fast development server and optimized production builds
- **TypeScript**: Static type checking across the entire application
- **ESBuild**: Fast JavaScript bundler for server-side code compilation