import React from 'react';
import Link from 'next/link';
import { X, HelpCircle, AudioLines } from 'lucide-react';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string | React.ReactNode;
  showBackLink?: boolean;
  backLinkText?: string;
  backLinkHref?: string;
  onClose?: () => void;
}

export default function AuthLayout({
  children,
  title,
  subtitle,
  showBackLink = false,
  backLinkText,
  backLinkHref,
  onClose
}: AuthLayoutProps) {
  return (
    <div className="h-screen bg-[#121212] flex items-center justify-center p-4">
      <div className="w-full h-full overflow-hidden flex gap-4">
        {/* Left Panel - Form */}
        <div className="flex-1 flex flex-col p-6 lg:p-8 bg-[#121212]">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center h-8">
                <AudioLines className="h-5 w-5 text-white flex-shrink-0" />
              </div>
            </div>
            <Link
              href="/help"
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
            >
              <HelpCircle className="w-4 h-4" />
              Need help?
            </Link>
          </div>

          {/* Form Content */}
          <div className="flex-1 flex flex-col justify-center items-center">
            <div className="w-full max-w-md text-left">
              <h1 className="text-3xl font-semibold text-white mb-2">
                {title}
              </h1>
              {subtitle && (
                <p className="text-gray-400 text-sm mb-8">
                  {subtitle}
                </p>
              )}
              
              {children}
            </div>
          </div>
        </div>

        {/* Right Panel - Background */}
        <div className="hidden lg:flex lg:flex-1 lg:relative bg-[#2a2a2a] rounded-2xl overflow-hidden">
          {/* Close Button */}
          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-6 right-6 z-10 w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          
          {/* Content Overlay - Bottom Left */}
          <div className="absolute bottom-0 left-0 p-8 text-white z-10">
            <h2 className="text-xl font-medium leading-normal mb-6">
              Keep every project on track<br />
              from first idea to final delivery.
            </h2>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
                <span className="text-gray-300">All assets, tasks, and deadlines in one place</span>
              </div>
              
              <div className="flex items-center space-x-3">
                <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
                <span className="text-gray-300">Everyone works from the same up-to-date information</span>
              </div>
              
              <div className="flex items-center space-x-3">
                <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="text-gray-300">Clear processes that keep projects moving on time</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
