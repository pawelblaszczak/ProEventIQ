<!DOCTYPE html>
<html lang="${locale.currentLanguageTag!"en"}">
<head>
  <meta charset="utf-8" />
  <title>${msg("errorTitle")!"Error"}</title>
  <link rel="stylesheet" href="${url.resourcesPath}/css/style.css" />
</head>
<body>
  <div class="login-card">
    <h1>${msg("errorTitle")!"Error"}</h1>
    <p>${message.summary!message!"An unexpected error occurred."}</p>
    <p><a href="${url.loginUrl!url.loginAction!"/"}">${msg("backToLogin")!"Back to login"}</a></p>
  </div>
</body>
</html>
