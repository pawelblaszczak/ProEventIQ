<#-- Minimal Keycloak login form using FreeMarker -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${properties.title?if_exists?html}</title>
  <link rel="stylesheet" href="${url.resourcesPath}/css/style.css" />
</head>
<body>
  <div class="brand">MyCompany</div>
  <div class="login-card">
    <h1>Sign in</h1>
    <#if message?has_content>
      <div class="message">${message}</div>
    </#if>
    <form id="kc-form-login" action="${url.loginAction}" method="post">
      <label for="username">Username</label>
      <input id="username" name="username" type="text" value="${username?if_exists}" />

      <label for="password">Password</label>
      <input id="password" name="password" type="password" />

      <input type="hidden" name="credentialId" value="${credentialId?if_exists}" />
      <button type="submit">Log in</button>
    </form>
  </div>
  <footer class="kc-footer">Powered by ProEventIQ</footer>
</body>
</html>
