import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function LocationTracker({ points, onProximityAlert, onSpeedUpdate, speedLimit }) {
  const map = useMap();
  const [userLocation, setUserLocation] = useState(null);
  const [lastPosition, setLastPosition] = useState(null);

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const checkProximityAndSpeed = (userLat, userLng, userSpeed) => {
    let nearestPoint = null;
    let minDistance = Infinity;

    // Find the nearest point within 10m
    for (const point of points) {
      const distance = calculateDistance(userLat, userLng, point.lat, point.lng);
      if (distance <= 10 && distance < minDistance) {
        minDistance = distance;
        nearestPoint = { ...point, distance };
      }
    }

    // If within 10m of any point
    if (nearestPoint) {
      // Check if speeding near the point
      if (userSpeed > speedLimit) {
        onProximityAlert({
          type: 'Speed Alert',
          name: `⚠️ SLOW DOWN! Speed: ${userSpeed.toFixed(1)} km/h (Max: ${speedLimit} km/h) near ${nearestPoint.name}`,
          distance: Math.round(nearestPoint.distance)
        });
      } else {
        // Show normal proximity alert if not speeding
        onProximityAlert({
          type: nearestPoint.type,
          name: nearestPoint.name,
          distance: Math.round(nearestPoint.distance)
        });
      }
    }
  };

  useEffect(() => {
    if (!navigator.geolocation) {
      alert('Geolocation not supported.');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const newLocation = { lat: latitude, lng: longitude };
        setUserLocation(newLocation);

        let userSpeed = 0;
        if (lastPosition) {
          const distance = calculateDistance(
            lastPosition.lat,
            lastPosition.lng,
            newLocation.lat,
            newLocation.lng
          );
          const timeDiff = (Date.now() - lastPosition.time) / 1000;
          userSpeed = (distance / timeDiff) * 3.6; // km/h
        }
        onSpeedUpdate(userSpeed.toFixed(1));

        setLastPosition({ ...newLocation, time: Date.now() });
        map.setView([latitude, longitude], 18);

        // Check proximity and speed only when near a point
        checkProximityAndSpeed(latitude, longitude, userSpeed);
      },
      (error) => {
        console.error('Error getting location:', error);
        alert('Enable location services.');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 1000
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [map, points, lastPosition, speedLimit]);

  return userLocation ? (
    <Marker position={userLocation}>
      <Popup>
        <strong>Your Location</strong><br />
        Lat: {userLocation.lat.toFixed(6)}<br />
        Lng: {userLocation.lng.toFixed(6)}
      </Popup>
    </Marker>
  ) : null;
}

function App() {
  const [points, setPoints] = useState([]);
  const [alert, setAlert] = useState(null);
  const [speed, setSpeed] = useState(0);
  const speedLimit = 5; // km/h

  useEffect(() => {
    fetch('/api/points')
      .then(res => res.ok ? res.json() : Promise.reject('Network error'))
      .then(data => setPoints(data))
      .catch(() => {
        setPoints([
          { name: "Hostel Camera-1", type: "CCTV", lat: 30.8627650, lng: 75.8607660 },
          { name: "Accidental Prone Area", type: "Speed Breaker", lat: 30.8611150, lng: 75.8610131 },
          { name: "Lipton Camera-2", type: "CCTV", lat: 30.8600959, lng: 75.8610409 },
          { name: "MBA Block Construction Area", type: "Speed Breaker", lat: 30.8601031, lng: 75.8603610 }
        ]);
      });
  }, []);

  const handleProximityAlert = (alertInfo) => {
    setAlert(alertInfo);
    setTimeout(() => setAlert(null), 5000);
  };

  const handleSpeedUpdate = (userSpeed) => setSpeed(userSpeed);

  const defaultCenter = [30.8627650, 75.8607660];

  return (
    <div style={{ height: '100vh', width: '100%', position: 'relative' }}>
      {/* Alert */}
      {alert && (
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          backgroundColor: alert.type === 'CCTV' ? '#ffeb3b' :
                           alert.type === 'Speed Alert' ? '#f44336' : '#ff9800',
          padding: '15px 25px',
          borderRadius: '8px',
          border: '3px solid #333',
          fontWeight: 'bold',
          fontSize: '16px',
          textAlign: 'center',
          boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
        }}>
          ⚠️ {alert.type}: {alert.name} {alert.distance > 0 ? `(${alert.distance}m away)` : ''}
        </div>
      )}

      {/* Map */}
      <MapContainer center={defaultCenter} zoom={16} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {points.map((point, i) => (
          <Marker key={i} position={[point.lat, point.lng]}>
            <Popup>
              <strong>{point.name}</strong><br />
              Type: {point.type}
            </Popup>
          </Marker>
        ))}
        <LocationTracker
          points={points}
          onProximityAlert={handleProximityAlert}
          onSpeedUpdate={handleSpeedUpdate}
          speedLimit={speedLimit}
        />
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
        <p style={{ margin: '5px 0', fontSize: '14px' }}>Alerts within 10m:</p>
        <ul style={{ margin: '5px 0', paddingLeft: '20px', fontSize: '13px' }}>
          <li>🚧 Speed Breakers / Construction</li>
          <li>🎥 CCTV Cameras</li>
          <li>⚡ Speed Limit: {speedLimit} km/h</li>
        </ul>
        <p style={{ marginTop: '10px', fontSize: '14px', fontWeight: 'bold' }}>
          Current Speed: {speed} km/h
        </p>
      </div>
    </div>
  );
}

export default App;