package dev.knightcore.proeventiq.service;

import dev.knightcore.proeventiq.api.model.Show;
import dev.knightcore.proeventiq.api.model.ShowInput;
import dev.knightcore.proeventiq.entity.ShowEntity;
import dev.knightcore.proeventiq.repository.ShowRepository;
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

    public ShowService(ShowRepository showRepository) {
        this.showRepository = showRepository;
    }

    @Transactional(readOnly = true)
    public List<Show> listShows(String name, Integer ageFrom, Integer ageTo) {
        log.info("Listing shows with filters - name: {}, ageFrom: {}, ageTo: {}", name, ageFrom, ageTo);
        List<ShowEntity> entities = showRepository.findByFilters(name, ageFrom, ageTo);
        return entities.stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public Optional<Show> getShow(Long showId) {
        log.info("Fetching show with ID: {}", showId);
        return showRepository.findById(showId).map(this::toDto);
    }

    @Transactional
    public Show addShow(ShowInput input) {
        log.info("Adding new show: {}", input.getName());
        ShowEntity entity = fromInput(input);
        ShowEntity saved = showRepository.save(entity);
        return toDto(saved);
    }

    @Transactional
    public Optional<Show> updateShow(Long showId, ShowInput input) {
        log.info("Updating show with ID: {}", showId);
        return showRepository.findById(showId).map(entity -> {
            updateShowEntityFromInput(entity, input);
            return toDto(showRepository.save(entity));
        });
    }

    @Transactional
    public boolean deleteShow(Long showId) {
        log.info("Deleting show with ID: {}", showId);
        if (showRepository.existsById(showId)) {
            showRepository.deleteById(showId);
            return true;
        }
        return false;
    }

    private Show toDto(ShowEntity entity) {
        Show dto = new Show();
        dto.setShowId(entity.getShowId().toString());
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
