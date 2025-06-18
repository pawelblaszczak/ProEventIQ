# API Configuration with /api Prefix

This project is configured to automatically use the `/api` prefix for all API calls. Here's how it works:

## Configuration Setup

### 1. Environment Files
- `src/environments/environment.ts` - Development configuration
- `src/environments/environment.prod.ts` - Production configuration

Both files specify the `apiUrl` with the `/api` prefix:
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080/api'  // API prefix included
};
```

### 2. Application Configuration
In `src/app/app.config.ts`, the API configuration is set up using the environment:

```typescript
import { Configuration } from './api/configuration';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    // ... other providers
    {
      provide: Configuration,
      useFactory: () => new Configuration({
        basePath: environment.apiUrl  // Uses the URL with /api prefix
      })
    }
  ]
};
```

### 3. Generated API Services
The generated API services (like `ProEventIQService`) automatically use the injected configuration:

```typescript
// The service constructor receives the configuration
constructor(protected httpClient: HttpClient, @Optional() @Inject(BASE_PATH) basePath: string|string[], @Optional() configuration?: Configuration) {
    super(basePath, configuration);
}
```

## How API Calls Work

When you make an API call through the generated services:

```typescript
// This call will automatically use http://localhost:8080/api/venues
this.apiService.getAllVenues().subscribe(...)
```

The base path (`http://localhost:8080/api`) is automatically prepended to all endpoint paths defined in the OpenAPI specification.

## Example Usage

```typescript
import { Component, inject, OnInit } from '@angular/core';
import { ProEventIQService } from '../api/api/pro-event-iq.service';

@Component({...})
export class MyComponent implements OnInit {
  private apiService = inject(ProEventIQService);

  ngOnInit() {
    // This will call http://localhost:8080/api/venues
    this.apiService.getAllVenues().subscribe(venues => {
      console.log('Venues loaded from API with /api prefix:', venues);
    });
  }
}
```

## Environment-Specific Configuration

- **Development**: API calls go to `http://localhost:8080/api`
- **Production**: API calls go to `https://your-production-domain.com/api`

The Angular build process automatically replaces the environment files based on the build configuration.

## Build Commands

- `ng serve` or `npm start` - Uses development environment
- `ng build --configuration=production` - Uses production environment with file replacement

This setup ensures that all API calls automatically include the `/api` prefix without any manual configuration in individual components or services.
