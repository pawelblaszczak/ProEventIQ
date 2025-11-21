# Custom Keycloak theme (mytheme)

This folder contains a minimal custom Keycloak theme at `themes/mytheme` that replaces the login page.

Files provided:
- `theme.properties` - theme descriptor
- `templates/login.ftl` - FreeMarker template for the login page
- `resources/css/style.css` - basic CSS
- `messages/messages.properties` - minimal localized text

How to use

1) Mounting at runtime (recommended for development)

- Run Keycloak and mount the `keycloak/themes` directory to `/opt/keycloak/themes` in the container. Example docker run snippet:

  docker run --rm -p 8080:8080 -v "$(pwd)/keycloak/themes:/opt/keycloak/themes" quay.io/keycloak/keycloak:22.0.0 start --http-port=8080

  Adjust image tag to your Keycloak version and start flags (Quarkus-based Keycloak uses `start`).

2) Baking the theme into a custom image

Add to your Dockerfile:

  COPY keycloak/themes /opt/keycloak/themes

Then build the image.

Notes for Keycloak (Quarkus-based, 17+)

- After adding a theme, Keycloak may cache templates. Restart Keycloak to ensure it picks up new files.
- For Quarkus-based Keycloak you don't need to run `kc.sh build` to use themes mounted under `/opt/keycloak/themes` — just restart.

Enabling the theme in the Admin Console

1. Login to Keycloak Admin Console as an admin.
2. Select the Realm you want to customize (e.g., `master` or your app realm).
3. Go to Realm Settings -> Themes.
4. For `Login Theme` select `mytheme` from the dropdown.
5. Save and test the login page.

Troubleshooting

- If `mytheme` doesn't appear in the dropdown, verify the theme directory structure is correct: `/opt/keycloak/themes/mytheme/theme.properties` and `templates/` exists.
- If changes don't show, restart Keycloak (caching). Clear browser cache if needed.
- For older Keycloak (pre-17) the base path may be `/opt/jboss/keycloak/themes` and startup flags differ.

Next steps / customization ideas

- Replace `templates/login.ftl` with your HTML; use provided FreeMarker variables like `${url.loginAction}`, `${username}`, `${message}`.
- Add images under `resources/img` and reference them via `${url.resourcesPath}/img/...`.
- Implement other templates (register, error, account) to fully brand your flows.

Dev: running Keycloak over HTTPS (local)

This repo includes helper files to run Keycloak locally over TLS for development:

- `Dockerfile.dev` - an image that copies `themes/` and `keycloak.jks` into the image and starts Keycloak on HTTPS 8443.
- `docker-compose.dev.yml` - example Compose file that builds the dev image, exposes port 8443, and mounts `themes` and `keycloak.jks` for iterative development.

Usage examples:

1) Using docker-compose for local dev (recommended):

  docker compose -f keycloak/docker-compose.dev.yml up --build

  Then open: https://localhost:8443

2) If your browser rejects the certificate (self-signed), either add the `keycloak.crt` to your OS/browser trust store, or test with `curl -k` to skip verification.

Keystore password

The dev examples assume the keystore password is `changeit`. If your `keycloak.jks` uses a different password, set the `KEYSTORE_PASSWORD` env var in `docker-compose.dev.yml` or change the `CMD` in `Dockerfile.dev` accordingly.

If you don't want to bake the keystore into the image, the compose file mounts `keycloak.jks` into the container at `/opt/keycloak/keystores/keycloak.jks` (read-only).

