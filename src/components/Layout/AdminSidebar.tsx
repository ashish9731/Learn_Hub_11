import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  BookOpen, 
  BarChart3,
  GraduationCap
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Course Assignment', href: '/admin/courses', icon: BookOpen },
  { name: 'Reports', href: '/admin/reports', icon: BarChart3 },
];

export default function AdminSidebar() {
  const navigate = useNavigate();

  const handleBrandClick = () => {
    navigate('/admin');
  };

  return (
    <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
      <div className="flex flex-col flex-grow bg-white border-r border-gray-200 pt-5 pb-4 overflow-y-auto dark:bg-gray-800 dark:border-gray-700">
        <div className="flex items-center flex-shrink-0 px-4">
          <button
            onClick={handleBrandClick}
            className="flex items-center hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 rounded-md"
          >
            <GraduationCap className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            <span className="ml-2 text-xl font-bold text-black dark:text-white">LearnHub</span>
          </button>
        </div>
        <div className="mt-8 flex-grow flex flex-col">
          <nav className="flex-1 px-2 space-y-1">
            {navigation.map((item) => (
              <button
                key={item.name}
                onClick={() => navigate(item.href)} 
                className="w-full flex items-center px-4 py-2 text-sm font-medium text-black rounded-md hover:bg-gray-100 mb-1 dark:text-white dark:hover:bg-gray-700"
              >
                <item.icon
                  className="mr-3 flex-shrink-0 h-5 w-5 text-gray-500 dark:text-gray-400"
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