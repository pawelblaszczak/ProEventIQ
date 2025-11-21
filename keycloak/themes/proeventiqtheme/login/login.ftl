<#-- ProEventIQ Keycloak Login Template - Fresh Start -->
<!DOCTYPE html>
<#assign lang = (locale.currentLanguageTag)!"en"?if_exists>
<html lang="${lang}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${msg("loginTitle")!"Sign in"} - ProEventIQ</title>
  <meta name="description" content="Sign in to ProEventIQ - End-to-end venue, event and reservation management" />
  <link rel="stylesheet" href="${url.resourcesPath}/css/style.css" />
</head>
<body>
  <!-- Hero Header Section - Matching Home Page -->
  <div class="hero-header">
    <div class="hero-content">
      <h1 class="hero-title">
        <span class="title-primary">Pro</span><span class="title-accent">Event</span><span class="title-secondary">IQ</span>
      </h1>
      <p class="hero-subtitle">End-to-end venue, event and reservation management</p>
    </div>
    <div class="hero-icon">
      <div class="icon-container">
        <svg class="calendar-icon" width="80" height="80" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
        </svg>
      </div>
    </div>
  </div>

  <!-- Login Form Section -->
  <div class="login-section">
    <div class="login-card">
      <#-- Show global/auth messages (errors, info) -->
      <#if message?has_content>
        <div class="message ${message.type!}" aria-live="polite" role="alert">
          ${message.summary!message}
        </div>
      </#if>
      
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
            placeholder="Enter your username or email"
          />
        </div>

        <div class="form-group">
          <label for="password">${msg("password")!"Password"}</label>
          <input 
            id="password" 
            name="password" 
            type="password" 
            autocomplete="current-password" 
            required
            placeholder="Enter your password"
          />
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
</body>
</html>
