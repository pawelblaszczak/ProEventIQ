package dev.knightcore.proeventiq.controller;

import dev.knightcore.proeventiq.api.controller.ShowsApi;
import dev.knightcore.proeventiq.api.model.Show;
import dev.knightcore.proeventiq.api.model.ShowInput;
import dev.knightcore.proeventiq.api.model.ShowOption;
import dev.knightcore.proeventiq.api.model.PaginatedShows;
import dev.knightcore.proeventiq.service.ShowService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.validation.annotation.Validated;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;

@RestController
@Validated
public class ShowController implements ShowsApi {
    
    private static final Logger log = LoggerFactory.getLogger(ShowController.class);
    private static final String INVALID_SHOW_ID_FORMAT = "Invalid show ID format: {}";
    private final ShowService showService;
    
    public ShowController(ShowService showService) {
        this.showService = showService;
    }

    @Override
    public ResponseEntity<Show> addShow(@Valid ShowInput showInput) {
        log.info("Adding new show: {}", showInput.getName());
        try {
            Show createdShow = showService.addShow(showInput);
            return ResponseEntity.status(HttpStatus.CREATED).body(createdShow);
        } catch (Exception e) {
            log.error("Error creating show: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @Override
    public ResponseEntity<Void> deleteShow(String showId) {
        log.info("Deleting show with ID: {}", showId);
        try {
            Long id = Long.parseLong(showId);
            boolean deleted = showService.deleteShow(id);
            if (deleted) {
                return ResponseEntity.status(HttpStatus.NO_CONTENT).build();
            } else {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
            }
        } catch (NumberFormatException e) {
            log.error(INVALID_SHOW_ID_FORMAT, showId);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        } catch (Exception e) {
            log.error("Error deleting show: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @Override
    public ResponseEntity<Show> getShowById(String showId) {
        log.info("Fetching show with ID: {}", showId);
        try {
            Long id = Long.parseLong(showId);
            return showService.getShow(id)
                    .map(ResponseEntity::ok)
                    .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND).build());
        } catch (NumberFormatException e) {
            log.error(INVALID_SHOW_ID_FORMAT, showId);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        } catch (Exception e) {
            log.error("Error fetching show: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @Override
    public ResponseEntity<List<ShowOption>> listShowOptions() {
        log.info("Listing show options");
        try {
            List<ShowOption> options = showService.listShowOptions();
            return ResponseEntity.ok(options);
        } catch (Exception e) {
            log.error("Error listing show options: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @Override
    public ResponseEntity<Show> updateShow(String showId, @Valid ShowInput showInput) {
        log.info("Updating show with ID: {}", showId);
        try {
            Long id = Long.parseLong(showId);
            return showService.updateShow(id, showInput)
                    .map(ResponseEntity::ok)
                    .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND).build());
        } catch (NumberFormatException e) {
            log.error(INVALID_SHOW_ID_FORMAT, showId);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        } catch (Exception e) {
            log.error("Error updating show: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @Override
    public ResponseEntity<PaginatedShows> listShows(String name, Integer ageFrom, Integer ageTo, Integer page, Integer size, String search) {
        log.info("Listing shows with filters - name: {}, ageFrom: {}, ageTo: {}, page: {}, size: {}, search: {}", name, ageFrom, ageTo, page, size, search);
        try {
            int pageNum = (page != null && page > 0) ? page : 1;
            int pageSize = (size != null && size > 0) ? size : 20;
            Page<Show> showPage = showService.listShowsPaginated(name, ageFrom, ageTo, search, PageRequest.of(pageNum - 1, pageSize));
            PaginatedShows result = new PaginatedShows()
                .items(showPage.getContent())
                .page(pageNum)
                .size(pageSize)
                .totalItems((int) showPage.getTotalElements())
                .totalPages(showPage.getTotalPages());
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Error listing shows: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
