package dev.knightcore.ProEventIQ.controller;

import dev.knightcore.proeventiq.api.model.UserDetailsDto;
import dev.knightcore.proeventiq.controller.UserController;
import dev.knightcore.proeventiq.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserControllerTest {

    @Mock
    private UserService userService;

    @InjectMocks
    private UserController userController;

    private UserDetailsDto testUserDto;

    @BeforeEach
    void setUp() {
        testUserDto = new UserDetailsDto("test@example.com");
        testUserDto.setName("Test User");
        testUserDto.setAddress("123 Test Street");
    }

    @Test
    void listUsers_ShouldReturnListOfUsers() {
        // Given
        List<UserDetailsDto> expectedUsers = Arrays.asList(testUserDto);
        when(userService.getAllUsers()).thenReturn(expectedUsers);

        // When
        ResponseEntity<List<UserDetailsDto>> response = userController.listUsers();

        // Then
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(1, response.getBody().size());
        assertEquals("test@example.com", response.getBody().get(0).getEmail());
        verify(userService, times(1)).getAllUsers();
    }

    @Test
    void listUsers_ShouldHandleException() {
        // Given
        when(userService.getAllUsers()).thenThrow(new RuntimeException("Database error"));

        // When
        ResponseEntity<List<UserDetailsDto>> response = userController.listUsers();

        // Then
        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        verify(userService, times(1)).getAllUsers();
    }

    @Test
    void getUserById_ShouldReturnUser_WhenUserExists() {
        // Given
        String userId = "user123";
        when(userService.getUserById(userId)).thenReturn(Optional.of(testUserDto));

        // When
        ResponseEntity<UserDetailsDto> response = userController.getUserById(userId);

        // Then
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("test@example.com", response.getBody().getEmail());
        verify(userService, times(1)).getUserById(userId);
    }

    @Test
    void getUserById_ShouldReturnNotFound_WhenUserDoesNotExist() {
        // Given
        String userId = "nonexistent";
        when(userService.getUserById(userId)).thenReturn(Optional.empty());

        // When
        ResponseEntity<UserDetailsDto> response = userController.getUserById(userId);

        // Then
        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertNull(response.getBody());
        verify(userService, times(1)).getUserById(userId);
    }

    @Test
    void getUserById_ShouldHandleException() {
        // Given
        String userId = "user123";
        when(userService.getUserById(userId)).thenThrow(new RuntimeException("Database error"));

        // When
        ResponseEntity<UserDetailsDto> response = userController.getUserById(userId);

        // Then
        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        verify(userService, times(1)).getUserById(userId);
    }

    @Test
    void updateUser_ShouldReturnUpdatedUser_WhenUserExists() {
        // Given
        String userId = "user123";
        UserDetailsDto updatedUserDto = new UserDetailsDto("updated@example.com");
        updatedUserDto.setName("Updated User");
        
        when(userService.existsById(userId)).thenReturn(true);
        when(userService.updateUser(userId, testUserDto)).thenReturn(Optional.of(updatedUserDto));

        // When
        ResponseEntity<UserDetailsDto> response = userController.updateUser(userId, testUserDto);

        // Then
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("updated@example.com", response.getBody().getEmail());
        verify(userService, times(1)).existsById(userId);
        verify(userService, times(1)).updateUser(userId, testUserDto);
    }

    @Test
    void updateUser_ShouldReturnNotFound_WhenUserDoesNotExist() {
        // Given
        String userId = "nonexistent";
        when(userService.existsById(userId)).thenReturn(false);

        // When
        ResponseEntity<UserDetailsDto> response = userController.updateUser(userId, testUserDto);

        // Then
        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertNull(response.getBody());
        verify(userService, times(1)).existsById(userId);
        verify(userService, never()).updateUser(any(), any());
    }

    @Test
    void updateUser_ShouldReturnNotFound_WhenUpdateReturnsEmpty() {
        // Given
        String userId = "user123";
        when(userService.existsById(userId)).thenReturn(true);
        when(userService.updateUser(userId, testUserDto)).thenReturn(Optional.empty());

        // When
        ResponseEntity<UserDetailsDto> response = userController.updateUser(userId, testUserDto);

        // Then
        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertNull(response.getBody());
        verify(userService, times(1)).existsById(userId);
        verify(userService, times(1)).updateUser(userId, testUserDto);
    }

    @Test
    void updateUser_ShouldHandleException() {
        // Given
        String userId = "user123";
        when(userService.existsById(userId)).thenThrow(new RuntimeException("Database error"));

        // When
        ResponseEntity<UserDetailsDto> response = userController.updateUser(userId, testUserDto);

        // Then
        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        verify(userService, times(1)).existsById(userId);
    }
}
