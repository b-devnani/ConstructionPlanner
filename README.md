# Construction Three-Week Look-Ahead Schedule

A comprehensive web application designed for construction superintendents to manage and visualize three-week look-ahead schedules. Built with modern web technologies to provide an intuitive, spreadsheet-like interface for construction project planning and coordination.

![Construction Schedule](generated-icon.png)

## 🚧 Features

### Core Functionality
- **Three-Week View**: Visual representation of activities across current week, next week, and next 2 weeks
- **Spreadsheet-Like Interface**: Inline editing with familiar keyboard shortcuts (Enter, Escape, Tab)
- **Activity Management**: Create, edit, and organize construction activities with contractors and locations
- **Date Range Selection**: Click-and-drag date selection for scheduling activities
- **Working Days Configuration**: Customizable working days (exclude weekends or holidays)
- **Real-time Updates**: Instant feedback and validation for schedule changes

### Advanced Features
- **Intelligent Sorting**: Manual refresh-based sorting to prevent data jumping
- **Group by Contractor/Location**: Organize activities by different criteria
- **Duration Calculation**: Automatic working-day duration calculations
- **Visual Feedback**: Color-coded activities by trade/contractor type
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Dark Mode Support**: Toggle between light and dark themes

### Construction-Specific
- **Trade-Based Organization**: Group activities by electrical, plumbing, drywall, framing, etc.
- **Contractor Management**: Assign and track responsible parties
- **Location Tracking**: Organize by building zones, floors, or areas
- **Non-Working Days**: Respect holidays and non-working days in calculations
- **Project Settings**: Configurable project parameters and working calendars

## 🛠 Technology Stack

### Frontend
- **React 18** - Modern React with hooks and functional components
- **TypeScript** - Type-safe development
- **Vite** - Lightning-fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **Framer Motion** - Smooth animations and interactions
- **Radix UI** - Accessible, unstyled UI components
- **shadcn/ui** - Beautiful, reusable component library
- **TanStack Query** - Powerful data fetching and caching
- **React Hook Form** - Performant forms with validation
- **Wouter** - Minimalist routing for React
- **date-fns** - Modern date utility library

### Backend
- **Node.js** - Server-side JavaScript runtime
- **Express.js** - Fast, unopinionated web framework
- **TypeScript** - Full-stack type safety
- **Drizzle ORM** - Type-safe database interactions
- **PostgreSQL** - Robust relational database (via Neon)
- **Zod** - Runtime type validation
- **Express Session** - Session management

### Development Tools
- **ESBuild** - Fast JavaScript bundler
- **PostCSS** - CSS preprocessing
- **Drizzle Kit** - Database migration tools
- **TSX** - TypeScript execution engine

## 📁 Project Structure

```
construction-schedule/
├── client/                     # Frontend React application
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   │   ├── ui/            # shadcn/ui components
│   │   │   └── schedule/      # Schedule-specific components
│   │   ├── lib/               # Utility libraries and contexts
│   │   ├── pages/             # Application pages
│   │   ├── types/             # TypeScript type definitions
│   │   └── utils/             # Helper functions
│   └── index.html
├── server/                     # Backend Express application
│   ├── index.ts               # Server entry point
│   ├── routes.ts              # API routes
│   ├── storage.ts             # Data storage interface
│   └── vite.ts                # Vite integration
├── shared/                     # Shared types and schemas
│   └── schema.ts              # Database schema and validation
├── package.json               # Dependencies and scripts
├── vite.config.ts             # Vite configuration
├── tailwind.config.ts         # Tailwind CSS configuration
├── drizzle.config.ts          # Database configuration
└── tsconfig.json              # TypeScript configuration
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18 or higher
- npm or yarn package manager
- PostgreSQL database (local or cloud)

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repository-url>
   cd construction-schedule
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Copy the example environment file
   cp .env.example .env
   
   # Edit .env with your database credentials
   DATABASE_URL=postgresql://username:password@localhost:5432/construction_schedule
   ```

4. **Set up the database**
   ```bash
   # Push database schema
   npm run db:push
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:5000` to view the application.

## 📋 Usage Guide

### Creating Activities
1. Click the **Add Activity** button (+ icon) in the bottom-right corner
2. Fill in the activity details:
   - **Activity Name**: Description of the work (e.g., "Install Electrical Outlets")
   - **Location**: Building area (e.g., "Floor 2 East Wing")
   - **Contractor**: Responsible party (e.g., "ABC Electrical")
   - **Start Date**: When work begins
   - **End Date**: When work completes
   - **Duration**: Automatically calculated in working days

### Editing Activities
- **Inline Editing**: Click any cell to edit directly
- **Date Selection**: Click on date cells to set start/end dates visually
- **Tab Navigation**: Use Tab key to move between fields
- **Save Changes**: Press Enter or click away to save
- **Cancel Changes**: Press Escape to cancel edits

### Organizing the Schedule
- **Sort Activities**: Use the "Sort By" dropdown to organize by date, duration, contractor, etc.
- **Group Activities**: Use "Group By" to organize by contractor or location
- **Refresh Data**: Click the Refresh button to update sorting and grouping
- **Filter Views**: Navigate between current week, next week, and future periods

### Project Settings
1. Click the **Settings** gear icon in the header
2. Configure:
   - **Working Days**: Select which days are working days
   - **First Day of Week**: Choose Sunday or Monday start
   - **Project Details**: Set project name and code
   - **Calendar Settings**: Customize schedule preferences

## 🎨 Customization

### Theme Configuration
The application uses a theme system defined in `theme.json`:
```json
{
  "primary": "#1976d2",
  "variant": "professional",
  "appearance": "light",
  "radius": 6
}
```

### Construction Colors
Tailwind configuration includes construction-specific colors:
- **Construction Blue**: `#1976d2` - Primary brand color
- **Construction Gray**: `#f5f5f5` - Background tones
- **Trade Colors**: Light blue (drywall), purple (electric), green (plumbing), yellow (framing)

### Adding New Activity Types
1. Update the `shared/schema.ts` file with new activity types
2. Add corresponding colors in `tailwind.config.ts`
3. Update the contractor/location data in the storage layer

## 🔧 API Reference

### Endpoints

#### Activities
- `GET /api/activities` - Retrieve all activities
- `POST /api/activities` - Create a new activity
- `PUT /api/activities/:id` - Update an existing activity
- `DELETE /api/activities/:id` - Delete an activity

#### Contractors
- `GET /api/contractors` - Retrieve all contractors
- `POST /api/contractors` - Create a new contractor

#### Locations
- `GET /api/locations` - Retrieve all locations
- `POST /api/locations` - Create a new location

### Data Models

#### Activity
```typescript
interface Activity {
  id: string | number;
  name: string;
  location: string;
  contractor: string;
  start_date: string;      // YYYY-MM-DD format
  end_date: string;        // YYYY-MM-DD format
  duration: number;        // Working days
  parentActivityId?: string;
}
```

## 🚢 Deployment

### Building for Production
```bash
# Build the application
npm run build

# Start production server
npm start
```

### Environment Variables
Required environment variables for production:
```bash
DATABASE_URL=postgresql://user:password@host:port/database
NODE_ENV=production
PORT=5000
SESSION_SECRET=your-secure-session-secret
```

### Database Setup
The application uses Drizzle ORM with PostgreSQL. Database schema is automatically synchronized using:
```bash
npm run db:push
```

## 🧪 Development

### Available Scripts
- `npm run dev` - Start development server with hot reloading
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run check` - Run TypeScript type checking
- `npm run db:push` - Synchronize database schema

### Code Style
- **TypeScript**: Strict mode enabled with comprehensive type checking
- **ESLint**: Code linting with React-specific rules
- **Prettier**: Automatic code formatting
- **Tailwind**: Utility-first CSS with consistent design system

### Testing
Currently using manual testing and TypeScript for type safety. Future plans include:
- Unit tests with Jest/Vitest
- Integration tests for API endpoints
- E2E tests with Playwright

## 📊 Performance

### Optimization Features
- **Lazy Loading**: Components and routes loaded on demand
- **Memoization**: React hooks optimized for performance
- **Virtual Scrolling**: Efficient rendering of large activity lists
- **Caching**: TanStack Query for intelligent data caching
- **Bundle Splitting**: Code splitting for faster initial loads

### Database Optimization
- **Indexing**: Optimized database queries with proper indexes
- **Connection Pooling**: Efficient database connection management
- **Query Optimization**: Minimized database calls with batch operations

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests: `npm run check`
5. Commit changes: `git commit -m 'Add amazing feature'`
6. Push to branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Code Guidelines
- Follow TypeScript strict mode requirements
- Use functional components with React hooks
- Implement proper error handling and validation
- Write descriptive commit messages
- Update documentation for new features

## 📞 Support

### Common Issues

#### Database Connection
If you encounter database connection issues:
1. Verify your `DATABASE_URL` in the `.env` file
2. Ensure PostgreSQL is running
3. Check network connectivity to your database server

#### Build Errors
For TypeScript or build errors:
1. Run `npm run check` to see detailed type errors
2. Clear node_modules: `rm -rf node_modules && npm install`
3. Restart the development server

#### Performance Issues
If the application is slow:
1. Check browser console for errors
2. Monitor network requests in developer tools
3. Consider reducing the number of activities displayed

### Getting Help
- Check the Issues section on GitHub
- Review the documentation for configuration options
- Contact the development team for construction-specific questions

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🎯 Roadmap

### Upcoming Features
- [ ] **Resource Management**: Track equipment and labor resources
- [ ] **Critical Path Analysis**: Identify schedule dependencies
- [ ] **Progress Tracking**: Monitor actual vs. planned progress
- [ ] **Mobile App**: Native mobile application for field use
- [ ] **PDF Reports**: Generate printable schedule reports
- [ ] **Integration**: Connect with popular construction management tools
- [ ] **Notifications**: Email/SMS alerts for schedule changes
- [ ] **Multi-Project**: Support for multiple concurrent projects

### Performance Improvements
- [ ] **Offline Support**: PWA capabilities for offline access
- [ ] **Real-time Sync**: WebSocket-based real-time updates
- [ ] **Advanced Caching**: Optimistic updates and background sync
- [ ] **Database Optimization**: Query performance improvements

---

**Built with ❤️ for construction professionals who need reliable, efficient schedule management.**

*For questions or support, please contact the development team or create an issue on GitHub.*
