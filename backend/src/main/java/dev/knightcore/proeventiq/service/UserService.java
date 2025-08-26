package dev.knightcore.proeventiq.service;

import dev.knightcore.proeventiq.api.model.UserDetailsDto;
import dev.knightcore.proeventiq.entity.UserEntity;
import dev.knightcore.proeventiq.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class UserService {
    
    private static final Logger log = LoggerFactory.getLogger(UserService.class);
    
    private final UserRepository userRepository;
    private final KeycloakUserService keycloakUserService;
    
    public UserService(UserRepository userRepository, KeycloakUserService keycloakUserService) {
        this.userRepository = userRepository;
        this.keycloakUserService = keycloakUserService;
    }
    
    /**
     * Get all users
     * @return List of UserDetailsDto
     */
    @Transactional(readOnly = true)
    public List<UserDetailsDto> getAllUsers() {
        log.debug("Getting all users");
        List<UserEntity> users = userRepository.findAll();
        return users.stream()
                .map(this::convertToDto)
                .toList();
    }
    
    /**
     * Get user by ID
     * @param userId the user ID
     * @return Optional containing UserDetailsDto if found
     */
    public Optional<UserDetailsDto> getUserById(String userId) {
        log.debug("Getting user by ID: {}", userId);
        
        // First, validate that the user exists in Keycloak
        if (!keycloakUserService.isValidKeycloakUser(userId)) {
            log.warn("User with ID {} not found or not authorized in Keycloak", userId);
            return Optional.empty();
        }
        log.debug("Get keycloak user by ID: {}", userId);
        // Get user from database
        Optional<UserEntity> userEntity = userRepository.findById(userId);
        
        if (userEntity.isPresent()) {
            log.debug("User found in database: {}", userId);
            return userEntity.map(this::convertToDto);
        } else {
            // User exists in Keycloak but not in our database, create from Keycloak profile
            log.debug("User exists in Keycloak but not in database, creating from Keycloak profile: {}", userId);
            return createUserFromKeycloakProfile(userId);
        }
    }
    
    /**
     * Update user by ID
     * @param userId the user ID
     * @param userDetailsDto the updated user data
     * @return Optional containing updated UserDetailsDto if user exists
     */
    public Optional<UserDetailsDto> updateUser(String userId, UserDetailsDto userDetailsDto) {
        log.debug("Updating user with ID: {}", userId);
        
        // First, validate that the user exists in Keycloak
        if (!keycloakUserService.isValidKeycloakUser(userId)) {
            log.warn("User with ID {} not found or not authorized in Keycloak", userId);
            return Optional.empty();
        }
        
        return userRepository.findById(userId)
                .map(existingUser -> {
                    // Update fields
                    if (userDetailsDto.getEmail() != null) {
                        existingUser.setEmail(userDetailsDto.getEmail());
                    }
                    if (userDetailsDto.getName() != null) {
                        existingUser.setName(userDetailsDto.getName());
                    }
                    if (userDetailsDto.getAddress() != null) {
                        existingUser.setAddress(userDetailsDto.getAddress());
                    }
                    if (userDetailsDto.getThumbnail() != null) {
                        existingUser.setThumbnail(userDetailsDto.getThumbnail());
                    }
                    if (userDetailsDto.getThumbnailContentType() != null) {
                        existingUser.setThumbnailContentType(userDetailsDto.getThumbnailContentType());
                    }
                    
                    UserEntity savedUser = userRepository.save(existingUser);
                    log.debug("User updated successfully: {}", savedUser.getId());
                    return convertToDto(savedUser);
                })
                .or(() -> {
                    // User doesn't exist in database but exists in Keycloak, create it
                    log.debug("User exists in Keycloak but not in database, creating: {}", userId);
                    return createUserFromKeycloakProfile(userId);
                });
    }
    
    /**
     * Create a new user
     * @param userDetailsDto the user data
     * @return created UserDetailsDto
     */
    public UserDetailsDto createUser(UserDetailsDto userDetailsDto) {
        log.debug("Creating new user with email: {}", userDetailsDto.getEmail());
        
        UserEntity userEntity = convertToEntity(userDetailsDto);
        // Generate a UUID for the user ID since it's not auto-generated
        String generatedId = java.util.UUID.randomUUID().toString();
        userEntity.setId(generatedId);
        
        try {
            UserEntity savedUser = userRepository.save(userEntity);
            log.info("User created successfully - ID: {}, Email: {}", 
                    savedUser.getId(), savedUser.getEmail());
            
            return convertToDto(savedUser);
        } catch (Exception e) {
            log.error("Failed to save user to database: {}", e.getMessage(), e);
            throw e;
        }
    }
    
    /**
     * Create a new user with specific ID
     * @param userId the user ID
     * @param userDetailsDto the user data
     * @return created UserDetailsDto
     */
    public UserDetailsDto createUser(String userId, UserDetailsDto userDetailsDto) {
        log.debug("Creating new user with ID: {} and email: {}", userId, userDetailsDto.getEmail());
        
        // Check if user with this email already exists
        Optional<UserEntity> existingUserByEmail = userRepository.findByEmail(userDetailsDto.getEmail());
        if (existingUserByEmail.isPresent()) {
            log.warn("User with email {} already exists in database with ID: {}", 
                    userDetailsDto.getEmail(), existingUserByEmail.get().getId());
            // Return the existing user or handle this case as needed
            return convertToDto(existingUserByEmail.get());
        }
        
        UserEntity userEntity = convertToEntity(userDetailsDto);
        userEntity.setId(userId);
        
        try {
            UserEntity savedUser = userRepository.save(userEntity);
            log.info("User created successfully - ID: {}, Email: {}", 
                    savedUser.getId(), savedUser.getEmail());
            
            return convertToDto(savedUser);
        } catch (Exception e) {
            log.error("Failed to save user with ID {} to database: {}", userId, e.getMessage(), e);
            throw e;
        }
    }
    
    /**
     * Check if user exists by ID
     * @param userId the user ID
     * @return true if user exists
     */
    @Transactional(readOnly = true)
    public boolean existsById(String userId) {
        return userRepository.existsById(userId);
    }
    
    /**
     * Find user by email
     * @param email the email address
     * @return Optional containing UserDetailsDto if found
     */
    @Transactional(readOnly = true)
    public Optional<UserDetailsDto> findByEmail(String email) {
        log.debug("Finding user by email: {}", email);
        return userRepository.findByEmail(email)
                .map(this::convertToDto);
    }

    /**
     * Create user from Keycloak profile when user exists in Keycloak but not in database
     * @param userId the user ID from Keycloak
     * @return Optional containing the created UserDetailsDto
     */
    private Optional<UserDetailsDto> createUserFromKeycloakProfile(String userId) {
        log.debug("Creating user from Keycloak profile for user ID: {}", userId);
        
        return keycloakUserService.getUserInfo(userId).map(userInfo -> {
            String email = (String) userInfo.get("email");
            
            UserDetailsDto userDto = new UserDetailsDto(email);
            
            // Save to database
            return createUser(userId, userDto);
        });
    }
    
    /**
     * Convert UserEntity to UserDetailsDto
     * @param userEntity the entity to convert
     * @return UserDetailsDto
     */
    private UserDetailsDto convertToDto(UserEntity userEntity) {
        if (userEntity == null) {
            return null;
        }
        
        UserDetailsDto dto = new UserDetailsDto(userEntity.getEmail());
        dto.setName(userEntity.getName());
        dto.setAddress(userEntity.getAddress());
        dto.setThumbnail(userEntity.getThumbnail());
        dto.setThumbnailContentType(userEntity.getThumbnailContentType());
        
        return dto;
    }
    
    /**
     * Convert UserDetailsDto to UserEntity
     * @param userDetailsDto the DTO to convert
     * @return UserEntity
     */
    private UserEntity convertToEntity(UserDetailsDto userDetailsDto) {
        if (userDetailsDto == null) {
            return null;
        }
        
        UserEntity entity = new UserEntity();
        entity.setEmail(userDetailsDto.getEmail());
        entity.setName(userDetailsDto.getName());
        entity.setAddress(userDetailsDto.getAddress());
        entity.setThumbnail(userDetailsDto.getThumbnail());
        entity.setThumbnailContentType(userDetailsDto.getThumbnailContentType());
        
        return entity;
    }
}
