module.exports = ({ config }) => {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || "AIzaSyChsEbappsA0uQ7lufsPv7QOEJ48-lDy6g";
  
  return {
    ...config,
    ios: {
      ...config.ios,
      config: {
        ...config.ios?.config,
        googleMapsApiKey: apiKey
      }
    },
    android: {
      ...config.android,
      config: {
        ...config.android?.config,
        googleMaps: {
          apiKey: apiKey
        }
      }
    }
  };
};
