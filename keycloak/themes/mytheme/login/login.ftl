<#-- Custom minimal Keycloak login template for mytheme -->
<!DOCTYPE html>
<html lang="${locale.currentLanguageTag!"en"}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${msg("loginTitle")!properties.title!"Login"}</title>
  <link rel="stylesheet" href="${url.resourcesPath}/css/style.css" />
</head>
<body>
  <div class="brand">ProEventIQ</div>
  <div class="login-card">
    <h1>${msg("loginTitle")!"Sign in"}</h1>
    <#-- Show global/auth messages (errors, info) -->
    <#if message?has_content>
      <div class="message ${message.type!}" aria-live="polite">${message.summary!message}</div>
    </#if>
    <form id="kc-form-login" action="${url.loginAction}" method="post" novalidate>
      <label for="username">${msg("username")!"Username"}</label>
      <input id="username" name="username" type="text" value="${(login.username)!username!""}" autocomplete="username" />

      <label for="password">${msg("password")!"Password"}</label>
      <input id="password" name="password" type="password" autocomplete="current-password" />

      <input type="hidden" name="credentialId" value="${credentialId!""}" />
      <button type="submit">${msg("doLogIn")!"Log in"}</button>
    </form>
  </div>
  <footer class="kc-footer">Powered by ProEventIQ</footer>
</body>
</html>
