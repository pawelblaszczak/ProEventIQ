package dev.knightcore.proeventiq.service;

import dev.knightcore.proeventiq.api.model.Venue;
import dev.knightcore.proeventiq.api.model.VenueInput;
import dev.knightcore.proeventiq.entity.VenueEntity;
import dev.knightcore.proeventiq.repository.VenueRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class VenueService {
    private final VenueRepository venueRepository;

    public VenueService(VenueRepository venueRepository) {
        this.venueRepository = venueRepository;
    }

    @Transactional(readOnly = true)
    public List<Venue> listVenues(String name, String country, String city) {
        List<VenueEntity> entities = venueRepository.findByNameContainingIgnoreCaseAndCountryContainingIgnoreCaseAndCityContainingIgnoreCase(
                name != null ? name : "",
                country != null ? country : "",
                city != null ? city : ""
        );
        return entities.stream().map(this::toDto).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Optional<Venue> getVenue(Long venueId) {
        return venueRepository.findById(venueId).map(this::toDto);
    }

    @Transactional
    public Venue addVenue(VenueInput input) {
        VenueEntity entity = fromInput(input);
        VenueEntity saved = venueRepository.save(entity);
        return toDto(saved);
    }

    @Transactional
    public Optional<Venue> updateVenue(Long venueId, VenueInput input) {
        return venueRepository.findById(venueId).map(entity -> {
            entity.setName(input.getName());
            entity.setCountry(input.getCountry());
            entity.setCity(input.getCity());
            entity.setAddress(input.getAddress());
            entity.setThumbnail(input.getThumbnail() != null ? input.getThumbnail().toString() : null);
            entity.setDescription(input.getDescription());
            return toDto(venueRepository.save(entity));
        });
    }

    @Transactional
    public boolean deleteVenue(Long venueId) {
        if (venueRepository.existsById(venueId)) {
            venueRepository.deleteById(venueId);
            return true;
        }
        return false;
    }

    private VenueEntity fromInput(VenueInput input) {
        VenueEntity entity = new VenueEntity();
        entity.setName(input.getName());
        entity.setCountry(input.getCountry());
        entity.setCity(input.getCity());
        entity.setAddress(input.getAddress());
        entity.setThumbnail(input.getThumbnail() != null ? input.getThumbnail().toString() : null);
        entity.setDescription(input.getDescription());
        return entity;
    }

    private Venue toDto(VenueEntity entity) {
        Venue dto = new Venue();
        dto.setVenueId(entity.getVenueId() != null ? entity.getVenueId().toString() : null);
        dto.setName(entity.getName());
        dto.setCountry(entity.getCountry());
        dto.setCity(entity.getCity());
        dto.setAddress(entity.getAddress());
        dto.setThumbnail(entity.getThumbnail() != null ? java.net.URI.create(entity.getThumbnail()) : null);
        dto.setDescription(entity.getDescription());
        // TODO: set numberOfSeats and sectors
        return dto;
    }
}
