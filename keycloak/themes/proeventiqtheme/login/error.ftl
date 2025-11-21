<#-- ProEventIQ Error Template -->
<!DOCTYPE html>
<#assign lang = (locale.currentLanguageTag)!"en"?if_exists>
<html lang="${lang}">
<head>
    <meta charset="utf-8">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${msg("errorTitle")!"Error"} - ProEventIQ</title>
    <link rel="stylesheet" href="${url.resourcesPath}/css/style.css" />
    <meta name="description" content="ProEventIQ - End-to-end venue, event and reservation management" />
</head>
<body>
    <!-- ProEventIQ Header with Logo -->
    <div class="brand">
        <span class="title-primary">Pro</span><span class="title-accent">Event</span><span class="title-secondary">IQ</span>
    </div>
    
    <!-- Main Error Container -->
    <div class="login-container">
        <div class="login-card">
            <h1>${msg("errorTitle")!"Oops! Something went wrong"}</h1>
            <p class="subtitle">We encountered an error while processing your request</p>
            
            <div class="message error" role="alert">
                ${message.summary!msg("unexpectedError")!"An unexpected error occurred."}
            </div>
            
            <#-- Show technical details only in dev if attribute set -->
            <#if (attributes["kc.showStackTrace"])??>
                <details class="error-details">
                    <summary>Technical Details</summary>
                    <pre class="error-stack">${(message.summary)!message?string!}</pre>
                </details>
            </#if>
            
            <div class="error-actions">
                <a href="${url.loginUrl!url.loginAction!"/"}" class="retry-link">
                    ${msg("backToLogin")!"Back to Login"}
                </a>
            </div>
        </div>
    </div>
    
    <!-- Footer -->
    <footer class="kc-footer">
        <span>Powered by </span>
        <strong>
            <span class="title-primary">Pro</span><span class="title-accent">Event</span><span class="title-secondary">IQ</span>
        </strong>
        <span> - End-to-end venue, event and reservation management</span>
    </footer>
</body>
</html>
