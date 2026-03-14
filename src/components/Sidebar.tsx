"use client";

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { LayoutDashboard, Activity, BarChart3, ShieldAlert, Settings, ChevronLeft, ChevronRight, Menu } from 'lucide-react';

const navItems = [
  { name: 'Live Feed', href: '/', icon: Activity },
  { name: 'Door Status', href: '/status', icon: LayoutDashboard },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Access Logs', href: '/logs', icon: ShieldAlert },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <motion.div
      initial={false}
      animate={{ width: isCollapsed ? 80 : 260 }}
      className="glass-panel h-screen flex flex-col relative shrink-0 z-50 transition-all duration-300 ease-in-out border-r border-white/10"
    >
      <div className="flex items-center justify-between p-4 h-20 border-b border-white/5">
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-3"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
               <ShieldAlert size={18} className="text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              Situator
            </span>
          </motion.div>
        )}
        
        {isCollapsed && (
           <div className="w-full flex justify-center">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                 <ShieldAlert size={18} className="text-white" />
              </div>
           </div>
        )}

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3.5 top-24 bg-slate-800 border border-white/10 p-1.5 rounded-full text-slate-300 hover:text-white hover:bg-slate-700 transition-colors z-50 shadow-lg"
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      <div className="flex-1 py-6 flex flex-col gap-2 px-3 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link key={item.name} href={item.href}>
              <div
                className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative
                  ${isActive 
                    ? 'bg-white/10 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]' 
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
              >
                {isActive && (
                   <motion.div
                     layoutId="activeTab"
                     className="absolute left-0 w-1 h-6 bg-blue-500 rounded-r-full"
                     initial={false}
                     transition={{ type: "spring", stiffness: 300, damping: 30 }}
                   />
                )}
                
                <Icon size={20} className={`shrink-0 ${isActive ? 'text-blue-400' : 'group-hover:text-white'}`} />
                
                {!isCollapsed && (
                  <span className="font-medium text-sm whitespace-nowrap">
                    {item.name}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
      
      <div className="p-4 border-t border-white/5">
         {!isCollapsed ? (
            <div className="text-xs text-slate-500 text-center">
               Situator WebGUI v1.0
            </div>
         ) : (
            <div className="text-xs text-slate-500 text-center">v1</div>
         )}
      </div>
    </motion.div>
  );
}
