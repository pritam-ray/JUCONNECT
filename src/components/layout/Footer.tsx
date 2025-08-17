import { Link } from 'react-router-dom'
import React from 'react'
import { BookOpen, Github, Mail, Heart, Sparkles, Star } from 'lucide-react'
import { cn } from '../../utils/cn'

interface FooterProps {
  className?: string
}

const Footer: React.FC<FooterProps> = ({ className }) => {
  return (
    <footer className={cn(
      "relative bg-gradient-to-br from-secondary-900 via-secondary-800 to-primary-900 text-white overflow-hidden",
      className
    )}>
      {/* Background decorations */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary-500/10 via-transparent to-primary-500/10" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent-500/5 rounded-full blur-3xl" />
      
      <div className="relative max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2 space-y-6">
            <div className="flex items-center space-x-3 group">
              <div className="relative">
                <BookOpen className="h-10 w-10 text-primary-400 group-hover:scale-110 transition-transform duration-300" />
                <div className="absolute inset-0 bg-primary-500 rounded-full blur-lg opacity-0 group-hover:opacity-30 transition-opacity duration-300" />
              </div>
              <span className="font-display font-bold text-2xl text-gradient">
                JU CONNECT
              </span>
              <Sparkles className="h-5 w-5 text-accent-400 animate-bounce-subtle" />
            </div>
            
            <p className="text-secondary-300 text-lg leading-relaxed max-w-md">
              A premium platform for JECRC University students. Share knowledge, connect globally, 
              and access thousands of educational resources in a beautiful, secure environment.
            </p>
            
            <div className="flex items-center space-x-2 text-secondary-400">
              <span>Crafted with</span>
              <Heart className="h-5 w-5 text-primary-400 animate-pulse" />
              <span>for students</span>
              <div className="flex space-x-1 ml-2">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 text-accent-400 fill-current animate-bounce-subtle" style={{ animationDelay: `${i * 0.1}s` }} />
                ))}
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <span>Quick Links</span>
              <div className="w-8 h-0.5 bg-gradient-to-r from-primary-500 to-transparent" />
            </h3>
            <ul className="space-y-3">
              {[
                { name: 'Browse Content', href: '/', external: false },
                { name: 'Categories', href: '/categories', external: false },
                { name: 'Upload Content', href: '/upload', external: false },
                { name: 'Student Chat', href: '/chat', external: false },
              ].map((link) => (
                <li key={link.name}>
                  {link.external ? (
                    <a 
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-secondary-300 hover:text-primary-400 transition-all duration-300 flex items-center space-x-2 group"
                    >
                      <div className="w-1 h-1 bg-primary-500 rounded-full group-hover:w-2 transition-all duration-300" />
                      <span className="group-hover:translate-x-1 transition-transform duration-300">{link.name}</span>
                    </a>
                  ) : (
                    <Link 
                      to={link.href} 
                      className="text-secondary-300 hover:text-primary-400 transition-all duration-300 flex items-center space-x-2 group"
                    >
                      <div className="w-1 h-1 bg-primary-500 rounded-full group-hover:w-2 transition-all duration-300" />
                      <span className="group-hover:translate-x-1 transition-transform duration-300">{link.name}</span>
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <span>Support</span>
              <div className="w-8 h-0.5 bg-gradient-to-r from-primary-500 to-transparent" />
            </h3>
            <ul className="space-y-3">
              {[
                { name: 'Help Center', href: 'https://github.com/pritam-ray/JUCONNECT/wiki', external: true },
                { name: 'Privacy Policy', href: 'https://github.com/pritam-ray/JUCONNECT/blob/main/PRIVACY.md', external: true },
                { name: 'Terms of Service', href: 'https://github.com/pritam-ray/JUCONNECT/blob/main/TERMS.md', external: true },
              ].map((link) => (
                <li key={link.name}>
                  {link.external ? (
                    <a 
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-secondary-300 hover:text-primary-400 transition-all duration-300 flex items-center space-x-2 group"
                    >
                      <div className="w-1 h-1 bg-primary-500 rounded-full group-hover:w-2 transition-all duration-300" />
                      <span className="group-hover:translate-x-1 transition-transform duration-300">{link.name}</span>
                    </a>
                  ) : (
                    <Link 
                      to={link.href} 
                      className="text-secondary-300 hover:text-primary-400 transition-all duration-300 flex items-center space-x-2 group"
                    >
                      <div className="w-1 h-1 bg-primary-500 rounded-full group-hover:w-2 transition-all duration-300" />
                      <span className="group-hover:translate-x-1 transition-transform duration-300">{link.name}</span>
                    </Link>
                  )}
                </li>
              ))}
              <li>
                <a 
                  href="mailto:impritamray@gmail.com" 
                  className="text-secondary-300 hover:text-primary-400 transition-all duration-300 flex items-center space-x-2 group"
                >
                  <Mail className="h-4 w-4 group-hover:scale-110 transition-transform duration-300" />
                  <span className="group-hover:translate-x-1 transition-transform duration-300">Contact Us</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-secondary-700/50 pt-8 mt-12">
          <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
            <p className="text-secondary-400 text-sm">
              © 2025 JU CONNECT. All rights reserved.
            </p>
            
            <div className="flex items-center space-x-6">
              <a
                href="https://github.com/pritam-ray/JUCONNECT"
                target="_blank"
                rel="noopener noreferrer"
                className="text-secondary-400 hover:text-primary-400 transition-all duration-300 hover:scale-110"
              >
                <Github className="h-5 w-5" />
              </a>
              
              <div className="flex items-center space-x-2 px-3 py-1 bg-gradient-to-r from-primary-500/20 to-primary-600/20 rounded-full border border-primary-500/30">
                <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse" />
                <span className="text-xs text-secondary-300 font-medium">v2.0.0</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer