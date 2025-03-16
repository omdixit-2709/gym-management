# Aesthetic Fitness Gym - Pages Documentation

## Table of Contents
1. [Login Page](#login-page)
2. [Dashboard Page](#dashboard-page)
3. [Members Page](#members-page)
4. [Walk-in Page](#walk-in-page)
5. [Staff Page](#staff-page)
6. [Settings Page](#settings-page)

## Login Page

### Functionality
- Role-based authentication system with three distinct access levels:
  - Admin (Owner)
  - Manager
  - Receptionist (Staff)
- Secure Firebase authentication integration
- Protected routes based on user roles
- Session management and persistence

### Implementation Details
- Uses Firebase Authentication for secure user management
- JWT token-based authentication
- Role-based route protection using custom middleware
- Automatic session timeout for security
- Failed login attempt tracking

### Importance
- Ensures data security and privacy
- Prevents unauthorized access
- Maintains accountability through role-based actions
- Complies with data protection requirements

## Dashboard Page

### Functionality
- Modern, responsive UI with real-time metrics:
  1. Active Members Count
  2. Inactive Members Count
  3. Renewable Memberships for Current Month
  4. Total Members Count
  5. Membership Growth Visualization
  6. Upcoming Renewals List

### Key Features
1. **Summary Cards**
   - Real-time member statistics
   - Trend indicators showing month-over-month changes
   - Color-coded status indicators

2. **Analytics Visualizations**
   - Membership growth line chart
   - Retention rate analysis
   - Subscription distribution pie chart
   - Payment status distribution
   - Monthly churn analysis

3. **Date Range Comparison**
   - Custom date range selection
   - Month-over-month comparison
   - Trend analysis and forecasting

### Implementation Details
- Real-time data synchronization with Firebase
- Recharts library for responsive visualizations
- Material-UI components for modern UI
- Redux for state management
- Automated calculations for metrics

### Importance
- Provides quick overview of gym's performance
- Helps in decision making through data visualization
- Enables trend analysis and forecasting
- Facilitates member retention strategies

## Members Page

### Functionality
1. **Member List Display**
   - Member photo
   - Name and contact information
   - Join date and subscription details
   - End date (auto-calculated)
   - Membership status
   - Payment status

2. **Member Management**
   - Add new members
   - Edit existing member details
   - Live photo capture
   - Photo upload functionality
   - Automatic end date calculation

3. **Filtering System**
   - Filter by subscription type:
     - Monthly (30 days)
     - Quarterly (90 days)
     - Semi-yearly (180 days)
     - Annual (365 days)
   - Filter by renewal status
   - Filter by payment status
   - Custom date range filters

4. **Import/Export Features**
   - Bulk import from CSV/XLSX
   - Export renewable member lists
   - Custom export formats
   - Data validation during import

### Implementation Details
- Firebase Firestore for data storage
- Firebase Storage for photo management
- WebcamJS for live photo capture
- Material-UI DataGrid for list management
- CSV/XLSX parsing libraries

### Importance
- Centralizes member management
- Streamlines administrative tasks
- Enables efficient member tracking
- Facilitates data-driven decisions

## Walk-in Page

### Functionality
1. **Visitor Tracking**
   - Name and contact information
   - Address details
   - Visit date and time
   - Follow-up scheduling

2. **Follow-up System**
   - Automated reminder generation
   - Follow-up date/time tracking
   - Staff assignment for follow-ups
   - Status tracking

3. **Notification System**
   - Staff notifications for follow-ups
   - Evening/morning reminders
   - Email/SMS notifications
   - Follow-up status updates

### Implementation Details
- Firebase Cloud Functions for automated reminders
- Notification system integration
- Calendar integration for scheduling
- Real-time status updates

### Importance
- Improves lead conversion
- Ensures consistent follow-up
- Tracks potential member pipeline
- Enhances customer service

## Staff Page

### Functionality
1. **Staff Management**
   - Staff profiles with photos
   - Contact information
   - Designation tracking
   - Attendance records

2. **Attendance System**
   - Biometric integration (Mantra MFS100)
   - Time slot management
   - Attendance tracking
   - Monthly reports generation

3. **Reporting System**
   - Individual attendance reports
   - Monthly summaries
   - Attendance analytics
   - Export functionality

### Implementation Details
- Biometric device integration via SDK
- Automated report generation
- Real-time attendance tracking
- Secure data storage

### Importance
- Ensures staff accountability
- Streamlines attendance tracking
- Facilitates payroll management
- Provides attendance analytics

## Settings Page

### Functionality
1. **SMS System**
   - Renewal reminders (3 days prior)
   - Event notifications
   - Custom message crafting
   - Bulk SMS sending

2. **Administrative Controls**
   - User role management
   - System configuration
   - Notification settings
   - Data management

3. **Reminder System**
   - Automated reminder scheduling
   - Custom reminder templates
   - Member group selection
   - Delivery tracking

### Implementation Details
- SMS gateway integration
- Firebase Cloud Functions for automation
- Role-based access control
- Custom notification system

### Importance
- Centralizes system management
- Enables automated communication
- Ensures member engagement
- Facilitates administrative control

## Technical Implementation Notes

### State Management
- Redux for global state
- Context API for theme/auth
- Local storage for persistence

### Data Flow
1. Firebase Realtime Database/Firestore
2. Redux Store
3. React Components
4. User Interface

### Security Measures
1. Role-based access control
2. Data encryption
3. Secure API calls
4. Input validation

### Performance Optimization
1. Lazy loading
2. Code splitting
3. Caching strategies
4. Optimized queries

This documentation provides a comprehensive overview of each page's functionality and its importance in meeting the client's requirements. The implementation details ensure scalability, security, and efficient operation of the gym management system. 