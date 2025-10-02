import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function LocationTracker({ points, onProximityAlert }) {
  const map = useMap();
  const [userLocation, setUserLocation] = useState(null);

  // Calculate distance between two coordinates using Haversine formula
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const checkProximity = (userLat, userLng) => {
    for (const point of points) {
      const distance = calculateDistance(userLat, userLng, point.lat, point.lng);
      if (distance <= 100) { // 100 meters
        onProximityAlert({
          type: point.type,
          name: point.name,
          distance: Math.round(distance)
        });
        break;
      }
    }
  };

  useEffect(() => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const newLocation = { lat: latitude, lng: longitude };
        setUserLocation(newLocation);
        
        // Center map on user location
        map.setView([latitude, longitude], 18);
        
        // Check proximity to points
        checkProximity(latitude, longitude);
      },
      (error) => {
        console.error('Error getting location:', error);
        alert('Error getting your location. Please enable location services.');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 1000
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [map, points]);

  return userLocation ? (
    <Marker position={userLocation}>
      <Popup>
        <strong>Your current location</strong><br />
        Lat: {userLocation.lat.toFixed(6)}<br />
        Lng: {userLocation.lng.toFixed(6)}
      </Popup>
    </Marker>
  ) : null;
}

function App() {
  const [points, setPoints] = useState([]);
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    // Fetch campus points from backend
    fetch('/api/points')
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(data => {
        console.log('Fetched points:', data);
        setPoints(data);
      })
      .catch(error => {
        console.error('Error fetching points:', error);
        // Use default points if backend is not available
        setPoints([
          {
            "name": "Main Gate Speed Breaker",
            "type": "Speed Breaker",
            "lat": 30.7333,
            "lng": 76.7794
          },
          {
            "name": "Library CCTV",
            "type": "CCTV",
            "lat": 30.7340,
            "lng": 76.7800
          }
        ]);
      });
  }, []);

  const handleProximityAlert = (alertInfo) => {
    setAlert(alertInfo);
    setTimeout(() => setAlert(null), 5000); // Clear alert after 5 seconds
  };

  // Default coordinates (GNE Campus approximate location)
  const defaultCenter = [30.7333, 76.7794];

  return (
    <div style={{ height: '100vh', width: '100%', position: 'relative' }}>
      {/* Alert Banner */}
      {alert && (
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          backgroundColor: alert.type === 'CCTV' ? '#ffeb3b' : '#ff9800',
          padding: '15px 25px',
          borderRadius: '8px',
          border: '3px solid #333',
          fontWeight: 'bold',
          fontSize: '16px',
          textAlign: 'center',
          boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
        }}>
          ⚠️ {alert.type} Ahead: {alert.name} ({alert.distance}m away)
        </div>
      )}

      {/* Map */}
      <MapContainer 
        center={defaultCenter} 
        zoom={16} 
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Campus Points Markers */}
        {points.map((point, index) => (
          <Marker key={index} position={[point.lat, point.lng]}>
            <Popup>
              <strong>{point.name}</strong><br />
              Type: {point.type}<br />
              Lat: {point.lat}<br />
              Lng: {point.lng}
            </Popup>
          </Marker>
        ))}
        
        {/* User Location Tracker */}
        <LocationTracker points={points} onProximityAlert={handleProximityAlert} />
      </MapContainer>

      {/* Info Panel */}
      <div style={{
        position: 'absolute',
        top: '70px',
        right: '10px',
        backgroundColor: 'white',
        padding: '15px',
        borderRadius: '8px',
        zIndex: 1000,
        maxWidth: '250px',
        boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
        border: '2px solid #333'
      }}>
        <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>🚗 Highway Halo</h3>
        <p style={{ margin: '5px 0', fontSize: '14px' }}>Alerts within 100m:</p>
        <ul style={{ margin: '5px 0', paddingLeft: '20px', fontSize: '13px' }}>
          <li>🚧 Speed Breakers</li>
          <li>🎥 CCTV Cameras</li>
        </ul>
        <div style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
          <strong>GNE Campus Pilot Project</strong>
        </div>
      </div>

      {/* Loading Indicator */}
      {points.length === 0 && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 1000,
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          Loading map and points...
        </div>
      )}
    </div>
  );
}

export default App;