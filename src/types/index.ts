export interface Company {
  id: string;
  name: string;
  contactPerson: string;
  adminName: string;
  adminEmail: string;
  courses: number;
  users: number;
  email: string;
  phone: string;
  createdAt: Date;
  engagementRate: number;
  completionRate: number;
}

export interface Admin {
  id: string;
  name: string;
  email: string;
  companyName: string;
  courses: number;
  contact: string;
  createdAt: Date;
  isActive: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  adminName: string;
  companyName: string;
  courses: number;
  department: string;
  contact: string;
  completionHours: number;
  completionRate: number;
  createdAt: Date;
  isActive: boolean;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  category: 'Books' | 'HBR' | 'TED Talks' | 'Concept' | 'Role Play';
  uploadedBy: string;
  uploadDate: Date;
  duration: number;
  enrollments: number;
  completions: number;
  isActive: boolean;
  fileType: 'MP3' | 'MP4' | 'PDF' | 'MOV';
  fileUrl?: string;
  chapters?: CourseChapter[];
}

export interface CourseChapter {
  id: string;
  title: string;
  duration: number;
  fileUrl: string;
}

export interface Assignment {
  id: string;
  title: string;
  description: string;
  companyId: string;
  companyName: string;
  adminId: string;
  adminName: string;
  adminEmail: string;
  selectedCourses: string[];
  createdAt: Date;
  dueDate: Date;
  status: 'active' | 'completed' | 'draft';
}

export interface KPIData {
  totalCompanies: number;
  totalAdmins: number;
  totalUsers: number;
  totalCourses: number;
  activeCourses: number;
  totalCompletedHours: number;
  totalPodcasts: number;
  totalDocuments: number;
}

export interface AnalyticsData {
  totalOrganizations: number;
  totalCourses: number;
  totalPodcasts: number;
  totalUsers: number;
  totalLearningHours: number;
  learningEngagementTrend: Array<{
    week: string;
    engagement: number;
  }>;
  courseCompletionRate: Array<{
    course: string;
    completion: number;
  }>;
  topOrganizations: Array<{
    name: string;
    engagementRate: number;
    completionRate: number;
  }>;
  learningAreasDistribution: Array<{
    area: string;
    value: number;
  }>;
  topUsers: Array<{
    name: string;
    completionRate: number;
    coursesEnrolled: number;
    coursesCompleted: number;
  }>;
}