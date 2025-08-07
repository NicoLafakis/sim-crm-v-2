export const themes = {
  music: [
    { id: 'rock-band', name: 'ROCK BAND', icon: '🎸' },
    { id: 'pop-star', name: 'POP STAR', icon: '🎤' },
    { id: 'dj-hero', name: 'DJ HERO', icon: '🎧' },
    { id: 'orchestra', name: 'ORCHESTRA', icon: '🎼' },
  ],
  movies: [
    { id: 'blockbuster', name: 'BLOCKBUSTER', icon: '🎬' },
    { id: 'indie-film', name: 'INDIE FILM', icon: '🎭' },
    { id: 'animation', name: 'ANIMATION', icon: '✏️' },
    { id: 'documentary', name: 'DOCUMENTARY', icon: '📹' },
  ],
  'tv-shows': [
    { id: 'sitcom', name: 'SITCOM', icon: '📺' },
    { id: 'drama-series', name: 'DRAMA SERIES', icon: '🎭' },
    { id: 'reality-show', name: 'REALITY SHOW', icon: '📱' },
    { id: 'game-show', name: 'GAME SHOW', icon: '❓' },
  ],
  'video-games': [
    { id: 'rpg-adventure', name: 'RPG ADVENTURE', icon: '⚔️' },
    { id: 'retro-arcade', name: 'RETRO ARCADE', icon: '🕹️' },
    { id: 'esports-league', name: 'ESPORTS LEAGUE', icon: '🏆' },
    { id: 'mobile-game', name: 'MOBILE GAME', icon: '📱' },
  ]
};

export const industries = [
  { id: 'hair-salon', name: 'HAIR SALON', icon: '💇' },
  { id: 'saas-company', name: 'SAAS COMPANY', icon: '💻' },
  { id: 'law-firm', name: 'LAW FIRM', icon: '⚖️' },
  { id: 'gaming-company', name: 'GAMING COMPANY', icon: '🎮' },
  { id: 'aerospace', name: 'AEROSPACE', icon: '🚀' },
  { id: 'restaurant', name: 'RESTAURANT', icon: '🍽️' },
  { id: 'retail-store', name: 'RETAIL STORE', icon: '🛍️' },
  { id: 'healthcare', name: 'HEALTHCARE', icon: '🏥' },
  { id: 'education', name: 'EDUCATION', icon: '📚' },
  { id: 'real-estate', name: 'REAL ESTATE', icon: '🏠' },
];

export const frequencies = [
  { id: '1h', name: '1 HOUR', enabled: true },
  { id: '4h', name: '4 HOURS', enabled: true },
  { id: '1d', name: '1 DAY', enabled: true },
  { id: '1w', name: '1 WEEK', enabled: true },
  { id: '1m', name: '1 MONTH', enabled: true },
  { id: 'custom', name: 'CUSTOM', enabled: false },
];

export const hubspotObjects = [
  { id: 'contacts', name: 'CONTACTS', enabled: true, defaultValue: 25 },
  { id: 'companies', name: 'COMPANIES', enabled: true, defaultValue: 15 },
  { id: 'deals', name: 'DEALS', enabled: true, defaultValue: 10 },
  { id: 'tickets', name: 'TICKETS', enabled: true, defaultValue: 5 },
  { id: 'notes', name: 'NOTES', enabled: true, defaultValue: 20 },
  { id: 'tasks', name: 'TASKS', enabled: false, defaultValue: 0 },
  { id: 'calls', name: 'CALLS', enabled: false, defaultValue: 0 },
];

export const saasConnections = [
  { id: 'hubspot', name: 'HUBSPOT', icon: '🔗', enabled: true },
  { id: 'salesforce', name: 'SALESFORCE', icon: '🔒', enabled: false },
  { id: 'pipedrive', name: 'PIPEDRIVE', icon: '🔒', enabled: false },
  { id: 'zoho', name: 'ZOHO', icon: '🔒', enabled: false },
];
