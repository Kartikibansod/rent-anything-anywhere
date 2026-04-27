const KOLHAPUR_COORDS = { lat: 16.7050, lng: 74.2433 };

export function getLocationWithFallback() {
  if (!navigator.geolocation) {
    return Promise.resolve(KOLHAPUR_COORDS);
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      },
      () => resolve(KOLHAPUR_COORDS),
      {
        enableHighAccuracy: true,
        timeout: 7000,
        maximumAge: 60_000
      }
    );
  });
}

export { KOLHAPUR_COORDS };

