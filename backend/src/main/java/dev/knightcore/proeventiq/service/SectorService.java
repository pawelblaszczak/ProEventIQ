package dev.knightcore.proeventiq.service;

import dev.knightcore.proeventiq.dto.SectorDTO;
import dev.knightcore.proeventiq.dto.SectorInputDTO;
import dev.knightcore.proeventiq.entity.SectorEntity;
import dev.knightcore.proeventiq.entity.VenueEntity;
import dev.knightcore.proeventiq.repository.SectorRepository;
import dev.knightcore.proeventiq.repository.VenueRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class SectorService {
    private final SectorRepository sectorRepository;
    private final VenueRepository venueRepository;

    public SectorService(SectorRepository sectorRepository, VenueRepository venueRepository) {
        this.sectorRepository = sectorRepository;
        this.venueRepository = venueRepository;
    }

    @Transactional(readOnly = true)
    public List<SectorDTO> getSectorsByVenue(Long venueId) {
        return sectorRepository.findByVenue_VenueId(venueId).stream()
                .map(this::toDTO)
                .toList();
    }

    @Transactional
    public SectorDTO addSector(Long venueId, SectorInputDTO input) {
        VenueEntity venue = venueRepository.findById(venueId)
                .orElseThrow(() -> new IllegalArgumentException("Venue not found"));
        SectorEntity entity = new SectorEntity();
        entity.setName(input.name());
        entity.setPositionX(input.positionX());
        entity.setPositionY(input.positionY());
        entity.setStatus(input.status());
        entity.setVenue(venue);
        return toDTO(sectorRepository.save(entity));
    }

    @Transactional(readOnly = true)
    public Optional<SectorDTO> getSector(Long sectorId) {
        return sectorRepository.findById(sectorId).map(this::toDTO);
    }

    @Transactional
    public Optional<SectorDTO> updateSector(Long sectorId, SectorInputDTO input) {
        return sectorRepository.findById(sectorId).map(entity -> {
            entity.setName(input.name());
            entity.setPositionX(input.positionX());
            entity.setPositionY(input.positionY());
            entity.setStatus(input.status());
            return toDTO(sectorRepository.save(entity));
        });
    }

    @Transactional
    public boolean deleteSector(Long sectorId) {
        if (sectorRepository.existsById(sectorId)) {
            sectorRepository.deleteById(sectorId);
            return true;
        }
        return false;
    }

    private SectorDTO toDTO(SectorEntity entity) {
        return new SectorDTO(
                entity.getSectorId(),
                entity.getName(),
                entity.getPositionX(),
                entity.getPositionY(),
                entity.getStatus(),
                entity.getVenue() != null ? entity.getVenue().getVenueId() : null
        );
    }
}
