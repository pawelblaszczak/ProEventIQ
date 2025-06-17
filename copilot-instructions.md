# AI Rules for ProEventIQ

## PROJECT GUIDELINES

# AI Rules for ProEventIQ

## FRONTEND

### Guidelines for ANGULAR

#### ANGULAR_CODING_STANDARDS

- Use standalone components, directives, and pipes instead of NgModules
- Implement signals for state management instead of traditional RxJS-based approaches
- Use the new inject function instead of constructor injection
- Implement control flow with @if, @for, and @switch instead of *ngIf, *ngFor, etc.
- Leverage functional guards and resolvers instead of class-based ones
- Use the new deferrable views for improved loading states
- Implement OnPush change detection strategy for improved performance
- Use TypeScript decorators with explicit visibility modifiers (public, private)
- Leverage Angular CLI for schematics and code generation
- Implement proper lazy loading with loadComponent and loadChildren

#### ANGULAR_MATERIAL

- Create a dedicated module for Angular Material imports to keep the app module clean
- Use theme mixins to customize component styles instead of overriding CSS
- Implement OnPush change detection for performance critical components
- Leverage the CDK (Component Development Kit) for custom component behaviors
- Use Material's form field components with reactive forms for consistent validation UX
- Implement accessibility attributes and ARIA labels for interactive components
- Use the new Material 3 design system updates where available
- Leverage the Angular Material theming system for consistent branding
- Implement proper typography hierarchy using the Material typography system
- Use Angular Material's built-in a11y features like focus indicators and keyboard navigation

#### NGRX

- Use the createFeature and createReducer functions to simplify reducer creation
- Implement the facade pattern to abstract NgRx implementation details from components
- Use entity adapter for collections to standardize CRUD operations
- Leverage selectors with memoization to efficiently derive state and prevent unnecessary calculations
- Implement @ngrx/effects for handling side effects like API calls
- Use action creators with typed payloads to ensure type safety throughout the application
- Implement @ngrx/component-store for local state management in complex components
- Use @ngrx/router-store to connect the router to the store
- Leverage @ngrx/entity-data for simplified entity management
- Implement the concatLatestFrom operator for effects that need state with actions

## BACKEND

### Guidelines for JAVA

#### SPRING_BOOT

- Use Spring Boot for simplified configuration and rapid development with sensible defaults
- Prefer constructor-based dependency injection over `@Autowired`
- Avoid hardcoding values that may change externally, use configuration parameters instead
- For complex logic, use Spring profiles and configuration parameters to control which beans are injected instead of hardcoded conditionals
- If a well-known library simplifies the solution, suggest using it instead of generating a custom implementation
- Use DTOs as immutable `record` types
- Use Bean Validation annotations (e.g., `@Size`, `@Email`, etc.) instead of manual validation logic
- Use `@Valid` on request parameters annotated with `@RequestBody`
- Use custom exceptions for business-related scenarios
- Centralize exception handling with `@ControllerAdvice` and return a consistent error DTO
- REST controllers should handle only routing and I/O mapping, not business logic
- Use SLF4J for logging instead of `System.out.println`
- Prefer using lambdas and streams over imperative loops and conditionals where appropriate
- Use `Optional` to avoid `NullPointerException`

#### SPRING_DATA_JPA

- Define repositories as interfaces extending `JpaRepository` or `CrudRepository`
- Never expose JPA entities in API responses – always map them to DTOs
- Use `@Transactional` at the service layer for state-changing methods, and keep transactions as short as possible
- Use `@Transactional(readOnly = true)` for read-only operations
- Use `@EntityGraph` or fetch joins to avoid the N+1 select problem
- Use `@Query` for complex queries
- Use projections (DTOs) in multi-join queries with `@Query`
- Use Specifications for dynamic filtering
- Use pagination when working with large datasets
- Use `@Version` for optimistic locking in concurrent updates
- Avoid `CascadeType.REMOVE` on large entity relationships
- Use HikariCP for efficient connection pooling

## DATABASE

### Guidelines for SQL

#### MYSQL

- Use InnoDB storage engine for transactions and foreign key constraints
- Implement proper indexing strategies based on query patterns
- Use connection pooling for better performance
