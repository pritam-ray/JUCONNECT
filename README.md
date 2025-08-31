# 🎓 JU CONNECT - JECRC University Resource Hub

<div align="center">

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-Visit_Site-blue?style=for-the-badge)](https://pritam-ray.github.io/JUCONNECT/)
[![React](https://img.shields.io/badge/React-18.3.1-61DAFB?style=for-the-badge&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5.4-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com/)

*A modern, real-time platform for JECRC University students to share resources, collaborate, and connect with their academic community.*

[🚀 Quick Start](#-quick-start) • [✨ Features](#-features) • [🛠️ Tech Stack](#️-tech-stack) • [📱 Screenshots](#-screenshots) • [🤝 Contributing](#-contributing)

</div>

---

## 🌟 Overview

JU CONNECT is a comprehensive web application designed specifically for JECRC University students. It serves as a centralized hub for academic resource sharing, real-time communication, and community building. Whether you're looking for study materials, want to share your notes, or need to collaborate with classmates, JU CONNECT has you covered.

### 🎯 Why JU CONNECT?

- **🎓 University-Focused**: Built specifically for JECRC University students
- **📚 Academic Resource Hub**: Centralized access to study materials, notes, and previous year questions
- **💬 Real-time Communication**: Instant messaging and group chats for seamless collaboration
- **🔒 Secure & Private**: User authentication and secure file sharing
- **📱 Mobile-First Design**: Responsive interface that works on all devices
- **🚀 Modern Technology**: Built with the latest web technologies for optimal performance

---

## ✨ Features

### ⚙️ **Resource Management**
- **File Upload & Sharing**: Upload and share PDFs, images, documents, and more
- **Categorized Content**: Organized by subjects, semester, and resource types
- **Advanced Search**: Find exactly what you need with powerful search functionality
- **Download Management**: Secure file downloads with temporary access links

### 💬 **Communication & Collaboration**
- **Real-time Messaging**: Instant private messaging between students
- **Group Chats**: Subject-wise and class group discussions
- **File Sharing in Chats**: Share resources directly in conversations
- **Message History**: Access to complete conversation history
- **Online Status**: See who's currently active

### 👥 **Community Features**
- **User Profiles**: Personalized student profiles
- **Group Management**: Create and join study groups
- **Admin Controls**: Group moderation and management tools
- **Activity Tracking**: Stay updated with recent activities

### 🔐 **Security & Privacy**
- **Secure Authentication**: Email-based user registration and login
- **Data Privacy**: Your personal information is protected
- **File Security**: Secure file storage with access controls
- **Group Privacy**: Private groups with member-only access

### 🎨 **User Experience**
- **Modern Interface**: Clean, intuitive design with smooth animations
- **Dark/Light Themes**: Comfortable viewing in any lighting condition
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Fast Performance**: Lightning-fast loading and smooth interactions

---

## 🛠️ Tech Stack

### **Frontend**
- **⚛️ React 18.3.1** - Modern UI library with hooks and concurrent features
- **📘 TypeScript 5.5.4** - Type-safe JavaScript for better development experience
- **⚡ Vite 6.3.5** - Next-generation frontend build tool
- **🎨 Tailwind CSS 3.4.10** - Utility-first CSS framework for rapid styling
- **🧭 React Router 7.8.0** - Declarative routing for single-page applications

### **Backend & Database**
- **🗄️ Supabase** - Open-source Firebase alternative
- **🐘 PostgreSQL** - Robust relational database via Supabase
- **🔐 Supabase Auth** - Built-in authentication system
- **📁 Supabase Storage** - Secure file storage and management
- **📡 Real-time Subscriptions** - Live data updates and messaging

### **Development & Deployment**
- **📦 npm** - Package management
- **🔍 ESLint** - Code linting and formatting
- **🚀 Netlify** - Fast, secure deployment platform
- **📱 GitHub Pages** - Alternative deployment option
- **🔧 PostCSS** - CSS processing and optimization

---

## 🚀 Quick Start

### Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v16.0.0 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js) or **yarn**
- **Git** - [Download here](https://git-scm.com/)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/pritam-ray/JUCONNECT.git
   cd JUCONNECT
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Copy the environment template:
   ```bash
   cp .env.template .env
   ```
   
   Edit `.env` and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_APP_NAME=JU CONNECT
   VITE_APP_VERSION=1.0.0
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   
   Navigate to [http://localhost:5173](http://localhost:5173) to see the application running.

### 🗄️ Database Setup

If you're setting up your own instance, you'll need to:

1. **Create a Supabase project** at [supabase.com](https://supabase.com)
2. **Apply database migrations** located in `supabase/migrations/`
3. **Configure Row Level Security (RLS)** policies
4. **Set up file storage buckets**

For detailed database setup instructions, see the [Database Setup Guide](database/README.md).

---

## 📁 Project Structure

```
JU_CONNECT/
├── 📂 src/
│   ├── 📂 components/           # Reusable UI components
│   │   ├── 📂 admin/           # Admin panel components
│   │   ├── 📂 auth/            # Authentication forms
│   │   ├── 📂 chat/            # Chat interface components
│   │   ├── 📂 content/         # Content display components
│   │   ├── 📂 groups/          # Group management components
│   │   ├── 📂 layout/          # App layout (Navbar, Footer, Sidebar)
│   │   ├── 📂 messaging/       # Private messaging components
│   │   ├── 📂 ui/              # Basic UI components (Button, Input, etc.)
│   │   └── 📂 upload/          # File upload components
│   ├── 📂 contexts/            # React Context providers
│   │   └── AuthContext.tsx     # Authentication state management
│   ├── 📂 hooks/               # Custom React hooks
│   │   ├── usePrivateMessages.ts
│   │   └── useRealtime.ts
│   ├── 📂 lib/                 # Core configurations
│   │   └── supabase.ts         # Supabase client setup
│   ├── 📂 pages/               # Page components
│   │   ├── HomePage.tsx        # Landing page
│   │   ├── AuthPage.tsx        # Login/Register
│   │   ├── ChatPage.tsx        # Private messaging
│   │   ├── GroupsPage.tsx      # Group discussions
│   │   └── ...more pages
│   ├── 📂 services/            # API and business logic
│   │   ├── authService.ts      # Authentication logic
│   │   ├── chatService.ts      # Chat functionality
│   │   ├── fileUploadService.ts # File management
│   │   ├── secureFileService.ts # Secure downloads
│   │   └── ...more services
│   ├── 📂 types/               # TypeScript type definitions
│   │   ├── database.types.ts   # Supabase generated types
│   │   └── enhanced-schema.types.ts
│   └── 📂 utils/               # Helper functions and utilities
├── 📂 public/                  # Static assets
├── 📂 supabase/               # Database schema and functions
│   ├── 📂 migrations/         # Database migration files
│   └── 📂 functions/          # Edge functions
├── 📂 database/               # Database management scripts
│   ├── apply_changes.ps1      # PostgreSQL change application
│   └── change_template.sql    # SQL change template
└── 📄 Configuration files...
```

---

## 🎯 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | 🚀 Start development server with hot reload |
| `npm run build` | 📦 Build optimized production bundle |
| `npm run preview` | 👀 Preview production build locally |
| `npm run lint` | 🔍 Run ESLint for code quality checks |
| `npm run type-check` | 📘 Check TypeScript types without compilation |
| `npm run deploy` | 🌐 Build and deploy to GitHub Pages |

---

## 📱 Screenshots

<details>
<summary>🖼️ Click to view screenshots</summary>

### 🏠 Homepage
*Modern landing page with feature highlights and easy navigation*

### 🔐 Authentication
*Secure login and registration with email verification*

### 💬 Real-time Chat
*Instant messaging with file sharing capabilities*

### 👥 Group Discussions
*Subject-wise group chats for collaborative learning*

### 📚 Resource Library
*Organized study materials with search and filter options*

### 📱 Mobile Experience
*Responsive design optimized for mobile devices*

</details>

---

## 🤝 Contributing

We welcome contributions from the JECRC University community! Here's how you can help:

### 🐛 Report Bugs
- Check existing [issues](https://github.com/pritam-ray/JUCONNECT/issues) first
- Create detailed bug reports with steps to reproduce
- Include screenshots if applicable

### 💡 Suggest Features
- Open a [feature request](https://github.com/pritam-ray/JUCONNECT/issues/new)
- Describe the problem and proposed solution
- Explain how it would benefit the community

### 👨‍💻 Code Contributions

1. **Fork the repository**
   ```bash
   git clone https://github.com/your-username/JUCONNECT.git
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```

3. **Make your changes**
   - Follow the existing code style
   - Add tests if applicable
   - Update documentation

4. **Commit your changes**
   ```bash
   git commit -m 'feat: add amazing feature'
   ```

5. **Push to your branch**
   ```bash
   git push origin feature/amazing-feature
   ```

6. **Open a Pull Request**
   - Provide a clear description of changes
   - Reference any related issues
   - Wait for review and feedback

### 📋 Development Guidelines

- **Code Style**: Follow existing patterns and ESLint rules
- **Commits**: Use conventional commit messages
- **TypeScript**: Maintain type safety throughout
- **Testing**: Add tests for new functionality
- **Documentation**: Update docs for API changes

---

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | ✅ Yes |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | ✅ Yes |
| `VITE_APP_NAME` | Application name | ❌ No |
| `VITE_APP_VERSION` | Application version | ❌ No |

### Database Configuration

For database changes, use the PostgreSQL workflow:

```bash
# Create a new SQL file in database/ directory
# Apply changes remotely
.\database\apply_changes.ps1 -SqlFile "database\your_changes.sql"
```

---

## 🚀 Deployment

### Netlify (Recommended)
1. Connect your GitHub repository to Netlify
2. Set environment variables in Netlify dashboard
3. Deploy automatically on every push to main

### GitHub Pages
```bash
npm run deploy
```

### Manual Deployment
```bash
npm run build
# Upload dist/ folder to your hosting provider
```

---

## 🛟 Support & Help

### 📚 Documentation
- [Supabase Documentation](https://supabase.com/docs)
- [React Documentation](https://react.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

### 🐛 Issues & Bugs
- Check [existing issues](https://github.com/pritam-ray/JUCONNECT/issues)
- Create a [new issue](https://github.com/pritam-ray/JUCONNECT/issues/new)

### 💬 Community
- Connect with fellow JECRC students on the platform
- Share feedback and suggestions
- Help improve the platform for everyone

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

### What this means:
- ✅ Commercial use allowed
- ✅ Modification allowed
- ✅ Distribution allowed
- ✅ Private use allowed
- ❗ License and copyright notice required

---

## 👨‍💻 Author

**Pritam Ray**
- GitHub: [@pritam-ray](https://github.com/pritam-ray)
- LinkedIn: [pritamray](https://www.linkedin.com/in/pritamray/)
- Email: impritamray@gmail.com

---

## 🙏 Acknowledgments

- **JECRC University** - For inspiring this project
- **Supabase Team** - For the amazing backend platform
- **React Community** - For the excellent documentation and resources
- **Open Source Contributors** - For all the libraries that make this possible
- **JECRC Students** - For feedback and feature suggestions

---

## 🚀 Future Roadmap

- [ ] 📱 **Mobile App** - React Native version for iOS and Android
- [ ] 🤖 **AI Integration** - Smart content recommendations
- [ ] 📊 **Analytics Dashboard** - Usage statistics and insights
- [ ] 🔔 **Push Notifications** - Real-time updates and announcements
- [ ] 🌍 **Multi-language Support** - Hindi and other regional languages
- [ ] 📝 **Rich Text Editor** - Enhanced note-taking capabilities
- [ ] 🎥 **Video Chat** - Real-time video communication
- [ ] 📅 **Event Management** - Academic calendar and reminders

---

<div align="center">

**⭐ If you find this project helpful, please give it a star! ⭐**

Built with ❤️ for the JECRC University community

[🔝 Back to Top](#-ju-connect---jecrc-university-resource-hub)

</div>


