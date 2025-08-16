# JU CONNECT - Resource Hub

A modern web application for JECRC University students to access study materials, share resources, and connect with fellow students.

## Features

- 📚 **Resource Sharing** - Access study materials, PYQs, notes, and more
- 💬 **Chat System** - Connect and communicate with fellow students
- 📤 **File Upload** - Share your study materials with the community
- 👥 **User Authentication** - Secure login and user management
- 📱 **Responsive Design** - Works seamlessly on all devices
- 🎨 **Modern UI** - Beautiful, intuitive interface with Tailwind CSS

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Backend**: Supabase
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: Supabase Auth
- **File Storage**: Supabase Storage

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/pritam-ray/JUCONNECT.git
cd JUCONNECT
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env` file in the root directory and add your Supabase credentials:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Start the development server:
```bash
npm run dev
```

5. Open [http://localhost:5173](http://localhost:5173) in your browser.

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── admin/          # Admin-specific components
│   ├── auth/           # Authentication components
│   ├── chat/           # Chat functionality
│   ├── content/        # Content display components
│   ├── layout/         # Layout components (Navbar, Footer)
│   ├── messaging/      # Private messaging
│   ├── ui/             # Basic UI components
│   └── upload/         # File upload components
├── contexts/           # React contexts
├── lib/               # Utility libraries and configurations
├── pages/             # Page components
├── services/          # API and external service integrations
├── types/             # TypeScript type definitions
└── utils/             # Helper functions
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contact

**Pritam Ray** - [@pritam-ray](https://github.com/pritam-ray)

Project Link: [https://github.com/pritam-ray/JUCONNECT](https://github.com/pritam-ray/JUCONNECT)

---

Built with ❤️ for JECRC University students
