import { useState } from "react";
import { useLocation } from "wouter";
import { Search, History, Menu, X, Plus } from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [location, navigate] = useLocation();

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Mobile Sidebar Toggle */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden bg-white p-2 rounded-lg shadow-lg"
        data-testid="mobile-menu-toggle"
      >
        {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Sidebar */}
      <aside className={`fixed lg:relative z-40 w-64 h-full bg-white border-r border-slate-200 transition-transform ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div className="p-6 border-b border-slate-200">
          <h1 className="text-xl font-bold text-slate-900">Website Grader</h1>
          <p className="text-sm text-slate-600">AI-Powered Analysis</p>
        </div>
        
        <nav className="p-4">
          <ul className="space-y-2">
            <li>
              <button
                onClick={() => {
                  navigate('/');
                  setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg ${
                  location === '/' ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
                data-testid="nav-dashboard"
              >
                <Search className="w-5 h-5" />
                <span>Dashboard</span>
              </button>
            </li>
            <li>
              <button
                onClick={() => {
                  navigate('/history');
                  setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg ${
                  location === '/history' ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
                data-testid="nav-history"
              >
                <History className="w-5 h-5" />
                <span>Scan History</span>
              </button>
            </li>
          </ul>
        </nav>
        
        <div className="p-4 border-t border-slate-200">
          <div className="text-xs text-slate-500">
            <p>EAA Compliant</p>
            <p>Ireland-focused analysis</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden lg:ml-0">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4 pl-16 lg:pl-6 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Website Analysis Dashboard</h2>
              <p className="text-sm text-slate-600">Comprehensive site grading across 4 key pillars</p>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <button 
                onClick={() => navigate('/')}
                className="px-3 sm:px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base"
                data-testid="button-new-scan"
              >
                <Plus className="w-4 h-4 sm:mr-2 inline" />
                <span className="hidden sm:inline">New Scan</span>
              </button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}