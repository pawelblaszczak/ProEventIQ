package dev.knightcore.proeventiq.service;

import dev.knightcore.proeventiq.api.model.Sector;
import dev.knightcore.proeventiq.api.model.SectorInputPosition;
import dev.knightcore.proeventiq.api.model.SeatRow;
import dev.knightcore.proeventiq.api.model.Seat;
import dev.knightcore.proeventiq.dto.SectorDTO;
import dev.knightcore.proeventiq.dto.SectorInputDTO;
import dev.knightcore.proeventiq.entity.SectorEntity;
import dev.knightcore.proeventiq.entity.VenueEntity;
import dev.knightcore.proeventiq.repository.SectorRepository;
import dev.knightcore.proeventiq.repository.VenueRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
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
        entity.setOrderNumber(input.orderNumber());
        entity.setPositionX(input.positionX());
        entity.setPositionY(input.positionY());
        entity.setRotation(input.rotation());
        entity.setPriceCategory(input.priceCategory());
        entity.setStatus(input.status());
        entity.setLabelPositionX(input.labelPositionX());
        entity.setLabelPositionY(input.labelPositionY());
        entity.setLabelRotation(input.labelRotation());
        entity.setLabelFontSize(input.labelFontSize());
        entity.setVenue(venue);
        SectorEntity saved = sectorRepository.saveAndFlush(entity);
        // If a sourceSectorId is provided, copy seat layout from source sector using stored procedure.
        // @Modifying added to repository method to avoid ResultSet navigation errors.
        if (input.sourceSectorId() != null) {
            sectorRepository.copySectorSeats(input.sourceSectorId(), saved.getSectorId());
        }
        return toDTO(saved);
    }

    @Transactional(readOnly = true)
    public Optional<SectorDTO> getSector(Long sectorId) {
        return sectorRepository.findById(sectorId).map(this::toDTO);
    }

    @Transactional
    public Optional<SectorDTO> updateSector(Long sectorId, SectorInputDTO input) {
        return sectorRepository.findById(sectorId).map(entity -> {
            entity.setName(input.name());
            entity.setOrderNumber(input.orderNumber());
            entity.setPositionX(input.positionX());
            entity.setPositionY(input.positionY());
            entity.setRotation(input.rotation());
            entity.setPriceCategory(input.priceCategory());
            entity.setStatus(input.status());
            entity.setLabelPositionX(input.labelPositionX());
            entity.setLabelPositionY(input.labelPositionY());
            entity.setLabelRotation(input.labelRotation());
            entity.setLabelFontSize(input.labelFontSize());
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

    @Transactional(readOnly = true)
    public Optional<Sector> getSectorWithSeats(Long sectorId) {
        return sectorRepository.findById(sectorId).map(this::toSectorWithSeats);
    }

    private Sector toSectorWithSeats(SectorEntity entity) {
        Sector sector = new Sector();
        sector.setSectorId(entity.getSectorId());
        sector.setName(entity.getName());
        sector.setOrderNumber(entity.getOrderNumber());

        if (entity.getPositionX() != null && entity.getPositionY() != null) {
            SectorInputPosition position = new SectorInputPosition();
            position.setX(BigDecimal.valueOf(entity.getPositionX()));
            position.setY(BigDecimal.valueOf(entity.getPositionY()));
            sector.setPosition(position);
        }

        sector.setRotation(entity.getRotation());

        if (entity.getLabelPositionX() != null && entity.getLabelPositionY() != null) {
            SectorInputPosition labelPosition = new SectorInputPosition();
            labelPosition.setX(BigDecimal.valueOf(entity.getLabelPositionX()));
            labelPosition.setY(BigDecimal.valueOf(entity.getLabelPositionY()));
            sector.setLabelPosition(labelPosition);
        }

        sector.setLabelRotation(entity.getLabelRotation());

        sector.setLabelFontSize(entity.getLabelFontSize());

        sector.setPriceCategory(entity.getPriceCategory());

        if (entity.getStatus() != null) {
            sector.setStatus(Sector.StatusEnum.fromValue(entity.getStatus()));
        }

        // Map rows and seats
        mapSectorRows(entity, sector);

        return sector;
    }

    private void mapSectorRows(SectorEntity sectorEntity, Sector sectorDto) {
        int sectorSeatCount = 0;

        if (sectorEntity.getSeatRows() != null) {
            List<SeatRow> rowDtos = new ArrayList<>();

            for (var rowEntity : sectorEntity.getSeatRows()) {
                SeatRow rowDto = mapRowToDto(rowEntity);
                rowDtos.add(rowDto);
                sectorSeatCount += countSeatsInRow(rowEntity);
            }

            sectorDto.setRows(rowDtos);
        }

        sectorDto.setNumberOfSeats(sectorSeatCount);
    }

    private SeatRow mapRowToDto(dev.knightcore.proeventiq.entity.SeatRowEntity rowEntity) {
        SeatRow rowDto = new SeatRow();
        rowDto.setSeatRowId(rowEntity.getSeatRowId());
        rowDto.setName(rowEntity.getName());
        rowDto.setOrderNumber(rowEntity.getOrderNumber());

        if (rowEntity.getSeats() != null) {
            List<Seat> seatDtos = new ArrayList<>();

            for (var seatEntity : rowEntity.getSeats()) {
                Seat seatDto = mapSeatToDto(seatEntity);
                seatDtos.add(seatDto);
            }

            rowDto.setSeats(seatDtos);
        }

        return rowDto;
    }

    private Seat mapSeatToDto(dev.knightcore.proeventiq.entity.SeatEntity seatEntity) {
        Seat seatDto = new Seat();
        seatDto.setSeatId(seatEntity.getSeatId());
        seatDto.setOrderNumber(seatEntity.getOrderNumber());
        seatDto.setPriceCategory(seatEntity.getPriceCategory());
        seatDto.setStatus(seatEntity.getStatus() != null ?
            Seat.StatusEnum.fromValue(seatEntity.getStatus()) : null);

        if (seatEntity.getPositionX() != null && seatEntity.getPositionY() != null) {
            SectorInputPosition position = new SectorInputPosition();
            position.setX(BigDecimal.valueOf(seatEntity.getPositionX()));
            position.setY(BigDecimal.valueOf(seatEntity.getPositionY()));
            seatDto.setPosition(position);
        }

        return seatDto;
    }

    private int countSeatsInRow(dev.knightcore.proeventiq.entity.SeatRowEntity rowEntity) {
        return rowEntity.getSeats() != null ? rowEntity.getSeats().size() : 0;
    }

    private SectorDTO toDTO(SectorEntity entity) {
        return new SectorDTO(
                entity.getSectorId(),
                entity.getName(),
                entity.getOrderNumber() != null ? entity.getOrderNumber().intValue() : null,
                entity.getPositionX(),
                entity.getPositionY(),
                entity.getRotation() != null ? entity.getRotation().intValue() : null,
                entity.getPriceCategory(),
                entity.getStatus(),
                entity.getVenue() != null ? entity.getVenue().getVenueId() : null,
                entity.getLabelPositionX(),
                entity.getLabelPositionY(),
                entity.getLabelRotation(),
                entity.getLabelFontSize()
        );
    }
}
