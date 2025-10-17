export const environment = {
  production: true,
  apiUrl: 'https://api.proeventiq.pl', // Twój backend
  keycloak: {
    url: 'https://auth.proeventiq.pl', // Twój Keycloak
    realm: 'proeventiq',
    clientId: 'proeventiq-frontend'
  }
};