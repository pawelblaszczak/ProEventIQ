package dev.knightcore.ProEventIQ.controller;

import dev.knightcore.proeventiq.api.model.Show;
import dev.knightcore.proeventiq.api.model.ShowInput;
import dev.knightcore.proeventiq.controller.ShowController;
import dev.knightcore.proeventiq.service.ShowService;
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
class ShowControllerTest {

    @Mock
    private ShowService showService;

    @InjectMocks
    private ShowController showController;

    private Show testShow;
    private ShowInput testShowInput;

    @BeforeEach
    void setUp() {
        testShow = new Show();
        testShow.setShowId("1");
        testShow.setName("Test Show");
        testShow.setDescription("Test Description");
        testShow.setAgeFrom(12);
        testShow.setAgeTo(65);

        testShowInput = new ShowInput();
        testShowInput.setName("Test Show");
        testShowInput.setDescription("Test Description");
        testShowInput.setAgeFrom(12);
        testShowInput.setAgeTo(65);
    }

    @Test
    void addShow_ShouldReturnCreatedShow() {
        when(showService.addShow(any(ShowInput.class))).thenReturn(testShow);

        ResponseEntity<Show> response = showController.addShow(testShowInput);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertEquals(testShow, response.getBody());
        verify(showService).addShow(testShowInput);
    }

    @Test
    void getShowById_ShouldReturnShow_WhenExists() {
        when(showService.getShow(1L)).thenReturn(Optional.of(testShow));

        ResponseEntity<Show> response = showController.getShowById("1");

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(testShow, response.getBody());
        verify(showService).getShow(1L);
    }

    @Test
    void getShowById_ShouldReturnNotFound_WhenNotExists() {
        when(showService.getShow(1L)).thenReturn(Optional.empty());

        ResponseEntity<Show> response = showController.getShowById("1");

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertNull(response.getBody());
        verify(showService).getShow(1L);
    }

    @Test
    void getShowById_ShouldReturnBadRequest_WhenInvalidId() {
        ResponseEntity<Show> response = showController.getShowById("invalid");

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        verify(showService, never()).getShow(anyLong());
    }

    @Test
    void listShows_ShouldReturnListOfShows() {
        List<Show> shows = Arrays.asList(testShow);
        when(showService.listShows(any(), any(), any())).thenReturn(shows);

        ResponseEntity<List<Show>> response = showController.listShows("Test", 12, 65);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(shows, response.getBody());
        verify(showService).listShows("Test", 12, 65);
    }

    @Test
    void updateShow_ShouldReturnUpdatedShow_WhenExists() {
        when(showService.updateShow(1L, testShowInput)).thenReturn(Optional.of(testShow));

        ResponseEntity<Show> response = showController.updateShow("1", testShowInput);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(testShow, response.getBody());
        verify(showService).updateShow(1L, testShowInput);
    }

    @Test
    void updateShow_ShouldReturnNotFound_WhenNotExists() {
        when(showService.updateShow(1L, testShowInput)).thenReturn(Optional.empty());

        ResponseEntity<Show> response = showController.updateShow("1", testShowInput);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        verify(showService).updateShow(1L, testShowInput);
    }

    @Test
    void deleteShow_ShouldReturnNoContent_WhenDeleted() {
        when(showService.deleteShow(1L)).thenReturn(true);

        ResponseEntity<Void> response = showController.deleteShow("1");

        assertEquals(HttpStatus.NO_CONTENT, response.getStatusCode());
        verify(showService).deleteShow(1L);
    }
}
