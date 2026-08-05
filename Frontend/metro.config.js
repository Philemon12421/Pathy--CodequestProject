const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

const originalResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const currentPlatform = platform || context.platform;
  if (currentPlatform === 'web' && moduleName === 'react-native-maps') {
    return {
      filePath: path.resolve(__dirname, 'src/components/ReactNativeMapsMock.web.tsx'),
      type: 'sourceFile',
    };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, currentPlatform);
  }
  return context.resolveRequest(context, moduleName, currentPlatform);
};

module.exports = config;
