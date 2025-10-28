import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  UserCog, 
  Users, 
  Upload, 
  BarChart3,
  GraduationCap,
  Building2,
  UserCheck
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'All Companies', href: '/companies', icon: Building2 },
  { name: 'All Admins', href: '/admins', icon: UserCog },
  { name: 'All Users', href: '/users', icon: Users },
  { name: 'User Approval', href: '/user-approval', icon: UserCheck },
  { name: 'Content Upload', href: '/content', icon: Upload },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
];

export default function Sidebar() {
  const navigate = useNavigate();

  const handleBrandClick = () => {
    navigate('/');
  };

  return (
    <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
      <div className="flex flex-col flex-grow bg-[#1e1e1e] border-r border-[#333333] pt-5 pb-4 overflow-y-auto">
        <div className="flex items-center flex-shrink-0 px-4">
          <button
            onClick={handleBrandClick}
            className="flex items-center hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] focus:ring-offset-2 rounded-md"
          >
            <GraduationCap className="h-8 w-8 text-[#8b5cf6]" />
            <span className="ml-2 text-xl font-bold text-white">LearnHub</span>
          </button>
        </div>
        <div className="mt-8 flex-grow flex flex-col">
          <nav className="flex-1 px-2 space-y-1">
            {navigation.map((item) => (
              <button
                key={item.name}
                onClick={() => navigate(item.href)} 
                className="w-full flex items-center px-4 py-2 text-sm font-medium text-white rounded-md hover:bg-[#252525] mb-1"
              >
                <item.icon
                  className="mr-3 flex-shrink-0 h-5 w-5 text-[#a0a0a0]"
                  aria-hidden="true"
                />
                {item.name}
              </button>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}