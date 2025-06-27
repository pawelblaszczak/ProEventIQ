package dev.knightcore.proeventiq.service;

import dev.knightcore.proeventiq.api.model.SeatInput;
import dev.knightcore.proeventiq.api.model.SeatRowInput;
import dev.knightcore.proeventiq.entity.SeatEntity;
import dev.knightcore.proeventiq.entity.SeatRowEntity;
import dev.knightcore.proeventiq.entity.SectorEntity;
import dev.knightcore.proeventiq.repository.SeatRepository;
import dev.knightcore.proeventiq.repository.SeatRowRepository;
import dev.knightcore.proeventiq.repository.SectorRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class SeatService {
    
    private final SeatRepository seatRepository;
    private final SeatRowRepository seatRowRepository;
    private final SectorRepository sectorRepository;

    public SeatService(SeatRepository seatRepository, 
                      SeatRowRepository seatRowRepository,
                      SectorRepository sectorRepository) {
        this.seatRepository = seatRepository;
        this.seatRowRepository = seatRowRepository;
        this.sectorRepository = sectorRepository;
    }

    @Transactional
    public void updateSectorSeats(Long sectorId, List<SeatRowInput> rowInputs) {
        SectorEntity sector = sectorRepository.findById(sectorId)
                .orElseThrow(() -> new IllegalArgumentException("Sector not found"));

        clearExistingSeatRows(sectorId);
        createNewSeatRows(sector, rowInputs);
    }

    private void clearExistingSeatRows(Long sectorId) {
        List<SeatRowEntity> existingRows = seatRowRepository.findBySector_SectorId(sectorId);
        for (SeatRowEntity row : existingRows) {
            seatRepository.deleteAll(row.getSeats());
        }
        seatRowRepository.deleteAll(existingRows);
    }

    private void createNewSeatRows(SectorEntity sector, List<SeatRowInput> rowInputs) {
        for (SeatRowInput rowInput : rowInputs) {
            SeatRowEntity rowEntity = createSeatRow(sector, rowInput);
            createSeatsForRow(rowEntity, rowInput.getSeats());
        }
    }

    private SeatRowEntity createSeatRow(SectorEntity sector, SeatRowInput rowInput) {
        SeatRowEntity rowEntity = new SeatRowEntity();
        rowEntity.setName(rowInput.getName());
        rowEntity.setSector(sector);
        return seatRowRepository.save(rowEntity);
    }

    private void createSeatsForRow(SeatRowEntity rowEntity, List<SeatInput> seatInputs) {
        if (seatInputs != null) {
            for (SeatInput seatInput : seatInputs) {
                createSeat(rowEntity, seatInput);
            }
        }
    }

    private void createSeat(SeatRowEntity rowEntity, SeatInput seatInput) {
        SeatEntity seatEntity = new SeatEntity();
        seatEntity.setOrderNumber(seatInput.getOrderNumber());
        seatEntity.setPriceCategory(seatInput.getPriceCategory());
        seatEntity.setStatus(seatInput.getStatus() != null ? seatInput.getStatus().getValue() : null);
        seatEntity.setSeatRow(rowEntity);
        
        setSeatPosition(seatEntity, seatInput);
        seatRepository.save(seatEntity);
    }

    private void setSeatPosition(SeatEntity seatEntity, SeatInput seatInput) {
        if (seatInput.getPosition() != null) {
            seatEntity.setPositionX(seatInput.getPosition().getX() != null ? 
                seatInput.getPosition().getX().floatValue() : null);
            seatEntity.setPositionY(seatInput.getPosition().getY() != null ? 
                seatInput.getPosition().getY().floatValue() : null);
        }
    }
}
