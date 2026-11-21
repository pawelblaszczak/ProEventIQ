<#-- ProEventIQ Keycloak Login Template - Fresh Start -->
<!DOCTYPE html>
<#assign lang = (locale.currentLanguageTag)!"en"?if_exists>
<html lang="${lang}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${msg("loginTitle")!"Sign in"} - ProEventIQ</title>
  <meta name="description" content="ProEventIQ" />
  <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="${url.resourcesPath}/css/style.css" />
</head>
<body>
  <main class="login-shell">
    <div class="login-section">
      <div class="login-card">
        <#if locale?? && locale.supported?? && (locale.supported?size > 1)>
          <div class="locale-switch" aria-label="Language">
            <span class="material-icons" aria-hidden="true">language</span>
            <#list locale.supported as l>
              <a href="${l.url}" class="<#if l.languageTag == lang>active</#if>">${l.languageTag?upper_case}</a><#sep><span class="locale-sep">|</span>
            </#list>
          </div>
        </#if>
        <div class="brand-block">
          <span class="material-icons calendar-icon" aria-hidden="true">event_available</span>
          <div class="hero-title">Pro<span class="title-event">Event</span><span class="title-iq">IQ</span></div>
        </div>

        <#-- Show global/auth messages (errors, info) -->
        <#if message?has_content>
          <div class="message ${message.type!}" aria-live="polite" role="alert">
            ${message.summary!message}
          </div>
        </#if>
      
        <div class="login-heading">
          <p>${msg("loginIntro")!"Enter your details to manage events"}</p>
        </div>

        <form id="kc-form-login" action="${url.loginAction}" method="post" novalidate>
          <div class="form-group">
            <label for="username">${msg("username")!"Username"}</label>
            <input 
              id="username" 
              name="username" 
              type="text" 
              value="${(login.username)!username!""}" 
              autocomplete="username" 
              required
              placeholder="${msg("usernamePlaceholder")!"Enter your username or email"}"
            />
          </div>

          <div class="form-group">
            <label for="password">${msg("password")!"Password"}</label>
            <div class="password-wrap">
              <input 
                id="password" 
                name="password" 
                type="password" 
                autocomplete="current-password" 
                required
                placeholder="${msg("passwordPlaceholder")!"Enter your password"}"
              />
              <button type="button" class="toggle-password" aria-label="${msg("password")!"Password"}"
                onclick="var i=document.getElementById('password');var s=i.type==='password';i.type=s?'text':'password';this.firstElementChild.textContent=s?'visibility':'visibility_off';">
                <span class="material-icons" aria-hidden="true">visibility_off</span>
              </button>
            </div>
          </div>

          <input type="hidden" name="credentialId" value="${credentialId!""}" />
        
          <button type="submit" class="login-btn">
            ${msg("doLogIn")!"Sign In"}
          </button>
        </form>
      
        <#-- Additional login options -->
        <#if realm.resetPasswordAllowed>
          <div class="login-links">
            <a href="${url.loginResetCredentialsUrl}" class="forgot-password">
              ${msg("forgotPassword")!"Forgot Password?"}
            </a>
          </div>
        </#if>
      </div>
    </div>
  </main>
</body>
</html>
