export const environment = {
  production: true,
  apiUrl: 'https://api.proeventiq.pl/api', // Twój backend
  keycloak: {
    url: 'https://auth.proeventiq.pl', // Twój Keycloak
    realm: 'proeventiq',
    clientId: 'proeventiq-frontend'
  }
};