const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'safetrack/src/screens');

const replacements = [
  // AdPortalScreen
  { file: 'AdPortalScreen.tsx', search: 'daysLeft(expiresAt)', replace: 'daysLeft(expiresAt: any)' },
  { file: 'AdPortalScreen.tsx', search: 'formatDate(dateStr)', replace: 'formatDate(dateStr: any)' },
  { file: 'AdPortalScreen.tsx', search: 'StatusBadge({ ad })', replace: 'StatusBadge({ ad }: any)' },
  { file: 'AdPortalScreen.tsx', search: 'MyAdCard({ ad, onDelete })', replace: 'MyAdCard({ ad, onDelete }: any)' },
  { file: 'AdPortalScreen.tsx', search: 'animateStep = (newStep)', replace: 'animateStep = (newStep: any)' },
  { file: 'AdPortalScreen.tsx', search: 'handleDeleteAd = (id)', replace: 'handleDeleteAd = (id: any)' },
  // AdProximityManager
  { file: 'AdProximityManager.tsx', search: 'ProximityPopup({ ad, onDismiss })', replace: 'ProximityPopup({ ad, onDismiss }: any)' },
  { file: 'AdProximityManager.tsx', search: 'AutoDismissBar({ duration })', replace: 'AutoDismissBar({ duration }: any)' },
  // AIScreen
  { file: 'AIScreen.tsx', search: 'AIScreen({ navigation })', replace: 'AIScreen({ navigation }: any)' },
  // HomeScreen
  { file: 'HomeScreen.tsx', search: 'HomeScreen({ navigation })', replace: 'HomeScreen({ navigation }: any)' },
  { file: 'HomeScreen.tsx', search: 'StatCard({ icon, label, value, color })', replace: 'StatCard({ icon, label, value, color }: any)' },
  { file: 'HomeScreen.tsx', search: 'QuickAction({ icon, label, color, onPress })', replace: 'QuickAction({ icon, label, color, onPress }: any)' },
  { file: 'HomeScreen.tsx', search: 'IncidentCard({ incident })', replace: 'IncidentCard({ incident }: any)' },
  { file: 'HomeScreen.tsx', search: 'timeAgo(ts)', replace: 'timeAgo(ts: any)' },
  // LoginScreen
  { file: 'LoginScreen.tsx', search: 'LoginScreen({ navigation })', replace: 'LoginScreen({ navigation }: any)' },
  // MapScreen
  { file: 'MapScreen.tsx', search: 'MapScreen({ navigation })', replace: 'MapScreen({ navigation }: any)' },
  { file: 'MapScreen.tsx', search: '=> setLocation(l)', replace: '=> setLocation(l as any)' },
  { file: 'MapScreen.tsx', search: 'handleLocate = async (loc)', replace: 'handleLocate = async (loc: any)' },
  // MusicScreen
  { file: 'MusicScreen.tsx', search: 'MusicScreen({ navigation })', replace: 'MusicScreen({ navigation }: any)' },
  { file: 'MusicScreen.tsx', search: 'deleteTrack = async (id)', replace: 'deleteTrack = async (id: any)' },
  { file: 'MusicScreen.tsx', search: 'PlaylistCard({ playlist, onSelect })', replace: 'PlaylistCard({ playlist, onSelect }: any)' },
  { file: 'MusicScreen.tsx', search: 'TrackItem({ track, onPlay, onDelete })', replace: 'TrackItem({ track, onPlay, onDelete }: any)' },
  // ReportScreen
  { file: 'ReportScreen.tsx', search: 'ReportScreen({ navigation })', replace: 'ReportScreen({ navigation }: any)' },
  { file: 'ReportScreen.tsx', search: 'setMedia(result.assets[0])', replace: 'setMedia(result.assets[0] as any)' },
  { file: 'ReportScreen.tsx', search: 'formData.append(\'media\', media)', replace: 'formData.append(\'media\', media as any)' },
  { file: 'ReportScreen.tsx', search: 'catch (err)', replace: 'catch (err: any)' },
  // RoutesScreen
  { file: 'RoutesScreen.tsx', search: 'RoutesScreen({ navigation })', replace: 'RoutesScreen({ navigation }: any)' },
  { file: 'RoutesScreen.tsx', search: 'setSavedRoutes(data)', replace: 'setSavedRoutes(data as any)' },
  { file: 'RoutesScreen.tsx', search: 'toggleFavorite = async (id)', replace: 'toggleFavorite = async (id: any)' },
  { file: 'RoutesScreen.tsx', search: 'deleteRoute = async (id)', replace: 'deleteRoute = async (id: any)' },
  { file: 'RoutesScreen.tsx', search: 'navigateRoute = (route)', replace: 'navigateRoute = (route: any)' },
  { file: 'RoutesScreen.tsx', search: 'RouteCard({ route, onFav, onDelete, onNavigate })', replace: 'RouteCard({ route, onFav, onDelete, onNavigate }: any)' }
];

replacements.forEach(({ file, search, replace }) => {
  const filePath = path.join(srcDir, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace(search, replace);
    fs.writeFileSync(filePath, content);
  }
});

console.log('Fixed types in screens');
