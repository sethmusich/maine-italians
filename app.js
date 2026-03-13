const map = L.map('map', { zoomControl: true }).setView([44.5,-69.2], 7);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors',
  maxZoom: 19
}).addTo(map);

const SUPABASE_URL = 'https://qbfgjacwpoygbzsbrev.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFiZmdqYWN3cG95Z2J6c2JlcmV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MTk1NTAsImV4cCI6MjA4ODk5NTU1MH0.Flm5Ql4eAO0Xhg0S9Hd4vUzOTQl4k-MemTArmQGfWMw';
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const sandwichIcon = L.divIcon({
  html: '🥖',
  className: 'sandwich-marker',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16]
});

async function getAvg(spotId) {
  const { data } = await db.from('ratings').select('value').eq('spot_id', spotId);
  if (!data || data.length === 0) return null;
  const avg = data.reduce((sum, r) => sum + r.value, 0) / data.length;
  return { avg, count: data.length };
}

window.rate = async function(spotId, value) {
  const { error } = await db.from('ratings').insert({ spot_id: spotId, value });
  if (error) { alert('Could not save rating: ' + error.message); return; }
  location.reload();
};

const FALLBACK_SPOTS = [
  { id:1, name:"Amato's Portland",            lat:43.661, lng:-70.255, online:4.4 },
  { id:2, name:"Sam's Italian Foods Lewiston",lat:44.100, lng:-70.214, online:4.6 },
  { id:3, name:"Micucci Grocery Portland",    lat:43.659, lng:-70.257, online:4.8 },
  { id:4, name:"Bangor Sandwich Co",          lat:44.801, lng:-68.771, online:4.5 },
  { id:5, name:"Ricettas Falmouth",           lat:43.739, lng:-70.204, online:4.3 },
  { id:6, name:"Anania's Portland",           lat:43.668, lng:-70.258, online:4.4 }
];

async function init() {
  const { data, error } = await db.from('spots').select('*').order('name');
  const online = !error && data && data.length;
  const spots = online ? data : FALLBACK_SPOTS;
  if (!online) console.warn('Supabase unreachable, using fallback data');

  // Markers
  for (const spot of spots) {
    const result = online ? await getAvg(spot.id) : null;
    const communityRating = result
      ? `🍖 ${result.avg.toFixed(1)} (${result.count} ratings)`
      : 'No ratings yet';
    const marker = L.marker([spot.lat, spot.lng], { icon: sandwichIcon });
    marker.bindPopup(`
      <div class="popup">
        <b>${spot.name}</b>
        <br>${spot.city || ''}
        <br>🌐 Online: 🍖 ${spot.online}
        <br>👥 Community: ${communityRating}
        <br><br>Rate it:<br>
        <button onclick="rate(${spot.id},5)">🍖🍖🍖🍖🍖</button>
        <button onclick="rate(${spot.id},4)">🍖🍖🍖🍖</button>
        <button onclick="rate(${spot.id},3)">🍖🍖🍖</button>
        <button onclick="rate(${spot.id},2)">🍖🍖</button>
        <button onclick="rate(${spot.id},1)">🍖</button>
      </div>
    `);
    marker.addTo(map);
  }

  // Sidebar — online
  const byOnline = [...spots].sort((a, b) => b.online - a.online);
  document.getElementById('onlineTop').innerHTML = byOnline
    .map(s => `<li>${s.name}<br>🍖 ${s.online}</li>`).join('');

  // Sidebar — community
  const community = [];
  if (online) {
    for (const spot of spots) {
      const result = await getAvg(spot.id);
      if (result) community.push({ name: spot.name, ...result });
    }
  }
  community.sort((a, b) => b.avg - a.avg);
  document.getElementById('communityTop').innerHTML = community.length
    ? community.map(c => `<li>${c.name}<br>🍖 ${c.avg.toFixed(1)} (${c.count})</li>`).join('')
    : '<li>No community ratings yet</li>';
}

init();
