export const environment = {
  production: false,
  keycloakUrl: "N/A", // Replace with your Keycloak URL, e.g., keycloak.example.com
  realm: "N/A",  // Replace with your Keycloak realm name
  mobileLoginRedirect: "N/A",  // Replace with your valid redirect URI for login in your Keycloak client. IMPORTANT: It must be a deep link, e.g., myapp://auth/login
  mobileLogoutRedirect: "N/A",  // Replace with your valid post-logout redirect URI in your Keycloak client. IMPORTANT: It must be a deep link, e.g., myapp://auth/logout
  webClientId: "N/A",  // Replace with the client ID for your web application as configured in Keycloak
  mobileClientId: "N/A"  // Replace with the client ID for your mobile application as configured in Keycloak
};
