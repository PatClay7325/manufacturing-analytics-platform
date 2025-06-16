'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavLink {
  name: string;
  href: string;
  icon?: string;
}

export default function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();
  
  // Close menu when route changes
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);
  
  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMenuOpen(false);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const navLinks: NavLink[] = [
    { name: 'Home', href: '/' },
    { name: 'Dashboard', href: '/dashboard', icon: '📊' },
    { name: 'Equipment', href: '/equipment', icon: '⚙️' },
    { name: 'Alerts', href: '/alerts', icon: '🔔' },
    { name: 'AI Chat', href: '/manufacturing-chat', icon: '🤖' },
  ];
  
  const isActivePath = (path: string): boolean => {
    if (path === '/' && pathname !== '/') {
      return false;
    }
    return pathname?.startsWith(path) ?? false;
  };
  
  return (
    <nav className="bg-primary-700 text-white" aria-label="Main navigation">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <h1 className="text-xl font-bold">
              <Link href="/">
                Manufacturing Intelligence Platform
              </Link>
            </h1>
          </div>
          
          {/* Mobile menu button */}
          <div className="md:hidden">
            <button 
              type="button" 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-white hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              aria-expanded={isMenuOpen}
              aria-controls="mobile-menu"
              data-testid="mobile-menu-button"
            >
              <span className="sr-only">Open main menu</span>
              {/* Icon when menu is closed */}
              <svg 
                className={`${isMenuOpen ? 'hidden' : 'block'} h-6 w-6`} 
                xmlns="http://www.w3.org/2000/svg" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor" 
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              {/* Icon when menu is open */}
              <svg 
                className={`${isMenuOpen ? 'block' : 'hidden'} h-6 w-6`} 
                xmlns="http://www.w3.org/2000/svg" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor" 
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Desktop menu */}
          <div className="hidden md:block">
            <ul className="flex space-x-8">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link 
                    href={link.href}
                    className={`
                      hover:text-white hover:underline transition duration-150 ease-in-out
                      ${isActivePath(link.href) ? 'text-white font-medium' : 'text-blue-100'}
                    `}
                    aria-current={isActivePath(link.href) ? 'page' : undefined}
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      
      {/* Mobile menu, show/hide based on menu state */}
      <div 
        className={`${isMenuOpen ? 'block' : 'hidden'} md:hidden`} 
        id="mobile-menu"
      >
        <div className="px-2 pt-2 pb-3 space-y-1 bg-primary-700 border-t border-primary-600">
          {navLinks.map((link) => (
            <Link 
              key={link.href}
              href={link.href}
              className={`
                block px-3 py-2 rounded-md text-base font-medium 
                ${isActivePath(link.href) 
                  ? 'bg-primary-800 text-white' 
                  : 'text-blue-100 hover:bg-primary-600 hover:text-white'
                }
              `}
              aria-current={isActivePath(link.href) ? 'page' : undefined}
            >
              {link.icon && <span className="mr-2">{link.icon}</span>}
              {link.name}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}