# LearnHub - Professional Learning Management System

A comprehensive learning management system built with React, TypeScript, and Supabase.

## 🚀 Features

- **Multi-role Authentication**: Super Admin, Admin, and User roles
- **Content Management**: Upload podcasts and documents
- **Course Assignment**: Assign courses to users and track progress
- **Real-time Analytics**: Track learning progress and engagement
- **AI Chat Assistant**: Personalized learning recommendations
- **Email Notifications**: Automated welcome emails and course assignments

## 📧 Email Configuration

### Current Setup (Supabase SMTP)
The application uses Supabase SMTP with your Resend configuration for reliable email delivery.

### SMTP Configuration:
✅ **Supabase SMTP** configured with Resend
✅ **c2x.co.in domain verified** in Resend
✅ **Professional email templates** with LearnHub branding
✅ **Automatic credential sharing** for new users/admins

### Email Configuration:
- **SMTP Provider**: Resend via Supabase
- **From Address**: Configured in Supabase SMTP settings
- **Domain**: c2x.co.in (verified)
- **Templates**: Professional HTML with LearnHub branding

### Email Features:
- ✅ **Professional HTML templates** with LearnHub branding
- ✅ **Automatic credential sharing** for new users/admins
- ✅ **Password change requirements** for security
- ✅ **Course assignment notifications**
- ✅ **Responsive email design**
- ✅ **SMTP delivery** via Supabase with Resend

## 🛠 Setup Instructions

1. **Clone the repository**
2. **Install dependencies**: `npm install`
3. **Set up environment variables** (see `.env.example`)
4. **Configure Supabase**:
   - Create a new Supabase project
   - Run the migrations in `supabase/migrations/`
   - Configure SMTP settings with Resend
   - Set up the environment variables
5. **Start development**: `npm run dev`

## 🔧 Environment Variables

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenAI Configuration (for AI Chat)
VITE_OPENAI_API_KEY=your_openai_api_key

# Note: Email is configured via Supabase SMTP settings
```

## 📱 User Roles

### Super Admin
- Manage all companies, admins, and users
- Upload and manage content
- View system-wide analytics
- Approve user registrations

### Admin
- Manage users within their company
- Assign courses to users
- View company-specific reports
- Track user progress

### User
- Access assigned courses
- Track learning progress
- Use AI chat assistant
- Download resources

## 🎯 Key Features

### Content Management
- Upload podcasts (MP3, MP4, MOV)
- Upload documents (PDF, DOC, DOCX)
- Organize content by courses and categories

### Learning Analytics
- Real-time progress tracking
- Completion rates and engagement metrics
- User performance reports
- Company-wide analytics

### AI Integration
- Personalized learning recommendations
- Voice input support
- Learning path generation
- Progress insights

## 🔄 Real-time Synchronization

The application uses Supabase real-time subscriptions to sync data across all components:
- Automatic updates when content is added
- Real-time progress tracking
- Live user management
- Instant notifications

## 🚀 Deployment

The application is deployed on Netlify: [https://resonant-gnome-6d052d.netlify.app](https://resonant-gnome-6d052d.netlify.app)

### Build Commands:
- **Build**: `npm run build`
- **Preview**: `npm run preview`

## 📞 Support

For technical support or questions about email configuration, contact the development team.

---

Built with ❤️ using React, TypeScript, Supabase, and Tailwind CSS.