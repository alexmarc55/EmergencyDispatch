
export const MENU_ITEMS = [
  {
    label: 'Home Page',
    path: '/',
    allowedRoles: ['admin', 'operator', 'driver']
  },
  {
    label: 'Incidents',
    path: '/incidents',
    allowedRoles: ['admin', 'operator', 'driver'] 
  },
  {
    label: 'Ambulances',
    path: '/ambulances',
    allowedRoles: ['admin', 'operator', 'driver']
  },
  {
    label: 'Patients',
    path: '/patients',
    allowedRoles: ['admin', 'operator', 'driver']
  },
  {
    label: 'Hospitals',
    path: '/hospitals',
    allowedRoles: ['admin', 'operator', 'driver']
  },
  {
    label: 'Emergency Centers',
    path: '/emergency-centers',
    allowedRoles: ['admin', 'operator', 'driver']
  },
  {
    label: 'Users',
    path: '/users',
    allowedRoles: ['admin']
  },
  {
    label: 'Statistics',
    path: '/statistics',
    allowedRoles: ['admin']
  },
  {
    label: 'Settings',
    path: '/settings',
    allowedRoles: ['admin', 'operator', 'driver']
  }
];