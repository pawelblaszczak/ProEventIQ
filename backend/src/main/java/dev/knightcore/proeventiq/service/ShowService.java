package dev.knightcore.proeventiq.service;

import dev.knightcore.proeventiq.api.model.Show;
import dev.knightcore.proeventiq.api.model.ShowInput;
import dev.knightcore.proeventiq.api.model.ShowOption;
import dev.knightcore.proeventiq.entity.ShowEntity;
import dev.knightcore.proeventiq.repository.ShowRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Base64;
import java.util.List;
import java.util.Optional;

@Service
public class ShowService {
    private static final Logger log = LoggerFactory.getLogger(ShowService.class);
    private final ShowRepository showRepository;
    private final KeycloakUserService keycloakUserService;

    public ShowService(ShowRepository showRepository, KeycloakUserService keycloakUserService) {
        this.showRepository = showRepository;
        this.keycloakUserService = keycloakUserService;
    }

    @Transactional(readOnly = true)
        public List<Show> listShows(String name, Integer ageFrom, Integer ageTo) {
            String currentUsername = keycloakUserService.getCurrentUsername()
                .orElseThrow(() -> new IllegalStateException("User not authenticated"));
            log.info("Listing shows for user {} with filters - name: {}, ageFrom: {}, ageTo: {}", currentUsername, name, ageFrom, ageTo);
            List<ShowEntity> entities = showRepository.findByUserNameAndFilters(currentUsername, name, ageFrom, ageTo);
            return entities.stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
        public List<ShowOption> listShowOptions() {
            String currentUsername = keycloakUserService.getCurrentUsername()
                .orElseThrow(() -> new IllegalStateException("User not authenticated"));
            log.info("Listing show options for user {}", currentUsername);
            List<ShowEntity> entities = showRepository.findByUserName(currentUsername);
            return entities.stream()
                    .map(entity -> new ShowOption(
                        entity.getShowId(),
                        entity.getName()
                    ))
                    .toList();
    }

    @Transactional(readOnly = true)
        public Optional<Show> getShow(Long showId) {
            String currentUsername = keycloakUserService.getCurrentUsername()
                .orElseThrow(() -> new IllegalStateException("User not authenticated"));
            log.info("Fetching show with ID: {} for user {}", showId, currentUsername);
            return showRepository.findById(showId)
                .filter(entity -> currentUsername.equals(entity.getUserName()))
                .map(this::toDto);
    }

    @Transactional
        public Show addShow(ShowInput input) {
            String currentUsername = keycloakUserService.getCurrentUsername()
                .orElseThrow(() -> new IllegalStateException("User not authenticated"));
            log.info("Adding new show: {} for user {}", input.getName(), currentUsername);
            ShowEntity entity = fromInput(input);
            entity.setUserName(currentUsername);
            ShowEntity saved = showRepository.save(entity);
            return toDto(saved);
    }

    @Transactional
        public Optional<Show> updateShow(Long showId, ShowInput input) {
            String currentUsername = keycloakUserService.getCurrentUsername()
                .orElseThrow(() -> new IllegalStateException("User not authenticated"));
            log.info("Updating show with ID: {} for user {}", showId, currentUsername);
            return showRepository.findById(showId)
                .filter(entity -> currentUsername.equals(entity.getUserName()))
                .map(entity -> {
                    updateShowEntityFromInput(entity, input);
                    return toDto(showRepository.save(entity));
                });
    }

    @Transactional
        public boolean deleteShow(Long showId) {
            String currentUsername = keycloakUserService.getCurrentUsername()
                .orElseThrow(() -> new IllegalStateException("User not authenticated"));
            log.info("Deleting show with ID: {} for user {}", showId, currentUsername);
            Optional<ShowEntity> entityOpt = showRepository.findById(showId);
            if (entityOpt.isPresent() && currentUsername.equals(entityOpt.get().getUserName())) {
                showRepository.deleteById(showId);
                return true;
            }
            return false;
    }

    @Transactional(readOnly = true)
        public Page<Show> listShowsPaginated(String name, Integer ageFrom, Integer ageTo, String search, Pageable pageable) {
            String currentUsername = keycloakUserService.getCurrentUsername()
                .orElseThrow(() -> new IllegalStateException("User not authenticated"));
            log.info("Listing shows (paginated) for user {} with filters - name: {}, ageFrom: {}, ageTo: {}, search: {}, pageable: {}", currentUsername, name, ageFrom, ageTo, search, pageable);
            Page<ShowEntity> page = showRepository.findByUserNameAndFiltersPaginated(currentUsername, name, ageFrom, ageTo, search, pageable);
            return page.map(this::toDto);
    }

    private Show toDto(ShowEntity entity) {
        Show dto = new Show();
        dto.setShowId(entity.getShowId());
        dto.setUserName(entity.getUserName());
        dto.setName(entity.getName());
        dto.setDescription(entity.getDescription());
        dto.setAgeFrom(entity.getAgeFrom());
        dto.setAgeTo(entity.getAgeTo());
        dto.setThumbnailContentType(entity.getThumbnailContentType());
        
        // The API model expects byte[] directly, not Base64 string
        if (entity.getThumbnail() != null) {
            dto.setThumbnail(entity.getThumbnail());
        }
        
        return dto;
    }

    private ShowEntity fromInput(ShowInput input) {
        ShowEntity entity = new ShowEntity();
        updateShowEntityFromInput(entity, input);
        return entity;
    }

    private void updateShowEntityFromInput(ShowEntity entity, ShowInput input) {
        entity.setName(input.getName());
        entity.setDescription(input.getDescription());
        entity.setAgeFrom(input.getAgeFrom());
        entity.setAgeTo(input.getAgeTo());
        entity.setThumbnailContentType(input.getThumbnailContentType());
        
        if (input.getThumbnail() != null && !input.getThumbnail().isEmpty()) {
            try {
                // Handle data URL format (data:image/jpeg;base64,...)
                String base64Data = input.getThumbnail();
                if (base64Data.startsWith("data:")) {
                    int commaIndex = base64Data.indexOf(',');
                    if (commaIndex != -1) {
                        base64Data = base64Data.substring(commaIndex + 1);
                    }
                }
                entity.setThumbnail(Base64.getDecoder().decode(base64Data));
            } catch (IllegalArgumentException e) {
                log.warn("Invalid base64 thumbnail data for show: {}", input.getName());
                entity.setThumbnail(null);
            }
        }
    }
}
