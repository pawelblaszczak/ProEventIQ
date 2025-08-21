import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

// Intercepts HTTP errors and redirects to /unauthorized on 401
export const authErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        if (router.url !== '/unauthorized') {
          router.navigate(['/unauthorized'], { queryParams: { from: router.url } });
        }
      }
      return throwError(() => error);
    })
  );
};
