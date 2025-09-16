package dev.knightcore.proeventiq.service;

import dev.knightcore.proeventiq.api.model.SeatInput;
import dev.knightcore.proeventiq.api.model.SeatRowInput;
import dev.knightcore.proeventiq.entity.SeatEntity;
import dev.knightcore.proeventiq.entity.SeatRowEntity;
import dev.knightcore.proeventiq.entity.SectorEntity;
import dev.knightcore.proeventiq.repository.SeatRepository;
import dev.knightcore.proeventiq.repository.SeatRowRepository;
import dev.knightcore.proeventiq.repository.SectorRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;

@Service
public class SeatService {
    
    private static final Logger logger = LoggerFactory.getLogger(SeatService.class);
    
    private final SeatRepository seatRepository;
    private final SeatRowRepository seatRowRepository;
    private final SectorRepository sectorRepository;

    @PersistenceContext
    private EntityManager entityManager;

    public SeatService(SeatRepository seatRepository, 
                      SeatRowRepository seatRowRepository,
                      SectorRepository sectorRepository) {
        this.seatRepository = seatRepository;
        this.seatRowRepository = seatRowRepository;
        this.sectorRepository = sectorRepository;
    }

    @Transactional
    public void updateSectorSeats(Long sectorId, List<SeatRowInput> rowInputs) {
        logger.info("Updating sector seats for sector ID: {}", sectorId);
        
        SectorEntity sector = sectorRepository.findById(sectorId)
                .orElseThrow(() -> new IllegalArgumentException("Sector not found"));

        mergeRows(sector, rowInputs);
        
        logger.info("Successfully updated sector seats for sector ID: {}", sectorId);
    }

    private void mergeRows(SectorEntity sector, List<SeatRowInput> rowInputs) {
        logger.debug("Merging rows for sector: {}", sector.getSectorId());
        
        List<SeatRowEntity> existingRows = seatRowRepository.findBySector_SectorId(sector.getSectorId());
        logger.debug("Found {} existing rows", existingRows.size());
        
        // First, handle potential conflicts by temporarily updating order numbers
        handleOrderNumberConflicts(existingRows, rowInputs);
        
        // Update or create rows
        for (SeatRowInput rowInput : rowInputs) {
            SeatRowEntity existingRow = findExistingRowByNameAndSector(existingRows, rowInput, sector);
            
            if (existingRow != null) {
                logger.debug("Updating existing row: {} (order: {})", rowInput.getName(), rowInput.getOrderNumber());
                updateExistingRow(existingRow, rowInput);
            } else {
                logger.debug("Creating new row: {} (order: {})", rowInput.getName(), rowInput.getOrderNumber());
                createNewRow(sector, rowInput);
            }
        }
        
        // Remove rows that are no longer in the input
        removeObsoleteRows(existingRows, rowInputs);
    }

    private void handleOrderNumberConflicts(List<SeatRowEntity> existingRows, List<SeatRowInput> rowInputs) {
        // Create a map of desired order numbers from input
        Set<Integer> desiredOrderNumbers = rowInputs.stream()
                .map(SeatRowInput::getOrderNumber)
                .collect(java.util.stream.Collectors.toSet());
        
        // Temporarily assign negative order numbers to existing rows that would conflict
        for (SeatRowEntity existingRow : existingRows) {
            Integer currentOrder = existingRow.getOrderNumber();
            if (currentOrder != null && desiredOrderNumbers.contains(currentOrder)) {
                // Check if this existing row should keep this order number
                boolean shouldKeepOrder = rowInputs.stream()
                        .anyMatch(input -> 
                            input.getOrderNumber().equals(currentOrder) &&
                            input.getName().equals(existingRow.getName())
                        );
                
                if (!shouldKeepOrder) {
                    // Temporarily assign a negative order number to avoid conflicts
                    existingRow.setOrderNumber(-Math.abs(currentOrder));
                    seatRowRepository.save(existingRow);
                }
            }
        }
        // Ensure temporary changes are flushed so subsequent logic sees the updated order numbers
        entityManager.flush();
    }

    private SeatRowEntity findExistingRowByNameAndSector(List<SeatRowEntity> existingRows, SeatRowInput rowInput, SectorEntity sector) {
        // Prefer matching by ID if client provided it (prevents accidental inserts when editing)
        if (rowInput.getSeatRowId() != null) {
            Long id = rowInput.getSeatRowId();
            for (SeatRowEntity row : existingRows) {
                if (row.getSeatRowId() != null && row.getSeatRowId().equals(id)) {
                    return row;
                }
            }
        }

        // Fallback: find by name within the same sector
        return existingRows.stream()
                .filter(row -> rowInput.getName().equals(row.getName()) && row.getSector().equals(sector))
                .findFirst()
                .orElse(null);
    }

    private void updateExistingRow(SeatRowEntity existingRow, SeatRowInput rowInput) {
        // Update row properties
        existingRow.setName(rowInput.getName());
        existingRow.setOrderNumber(rowInput.getOrderNumber());
        
        seatRowRepository.save(existingRow);
        
        // Update seats for this row
        mergeSeatsForRow(existingRow, rowInput.getSeats());
    }

    private void createNewRow(SectorEntity sector, SeatRowInput rowInput) {
        SeatRowEntity rowEntity = createSeatRow(sector, rowInput);
        createSeatsForRow(rowEntity, rowInput.getSeats());
    }

    private void removeObsoleteRows(List<SeatRowEntity> existingRows, List<SeatRowInput> rowInputs) {
        for (SeatRowEntity existingRow : existingRows) {
            boolean stillExists = rowInputs.stream()
                    .anyMatch(input -> 
                        input.getOrderNumber().equals(existingRow.getOrderNumber()) 
                        && input.getName().equals(existingRow.getName())
                    );
            
            if (!stillExists) {
                // Delete all seats in this row first
                seatRepository.deleteAll(existingRow.getSeats());
                // Then delete the row
                seatRowRepository.delete(existingRow);
            }
        }
    }

    private void mergeSeatsForRow(SeatRowEntity rowEntity, List<SeatInput> seatInputs) {
        logger.debug("Merging seats for row: {} (ID: {})", rowEntity.getName(), rowEntity.getSeatRowId());
        
        // Get existing seats for this row
        List<SeatEntity> existingSeats = seatRepository.findBySeatRow_SeatRowId(rowEntity.getSeatRowId());
        logger.debug("Found {} existing seats in row", existingSeats.size());
        
        // Clear existing seats first, but do it properly
        if (!existingSeats.isEmpty()) {
            logger.debug("Deleting {} existing seats before creating new ones", existingSeats.size());
            // Delete seats individually to avoid constraint issues
            for (SeatEntity existingSeat : existingSeats) {
                seatRepository.delete(existingSeat);
            }
            // Force flush to ensure deletions are committed before insertions
            entityManager.flush();
            logger.debug("Flushed deletions to database");
        }
        
        // Validate and normalize seat order numbers to ensure uniqueness
        if (seatInputs != null && !seatInputs.isEmpty()) {
            normalizeSeatOrderNumbers(seatInputs);
            
            logger.debug("Creating {} new seats", seatInputs.size());
            for (SeatInput seatInput : seatInputs) {
                createSeat(rowEntity, seatInput);
            }
        }
    }

    private void normalizeSeatOrderNumbers(List<SeatInput> seatInputs) {
        // Ensure all seats have unique, sequential order numbers
        for (int i = 0; i < seatInputs.size(); i++) {
            SeatInput seat = seatInputs.get(i);
            seat.setOrderNumber(i + 1); // Assign sequential order numbers starting from 1
        }
    }

    private SeatRowEntity createSeatRow(SectorEntity sector, SeatRowInput rowInput) {
        SeatRowEntity rowEntity = new SeatRowEntity();
        rowEntity.setName(rowInput.getName());
        rowEntity.setOrderNumber(rowInput.getOrderNumber());
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
        logger.debug("Creating seat with order number {} for row {}", 
                    seatInput.getOrderNumber(), rowEntity.getName());
        
        SeatEntity seatEntity = new SeatEntity();
        seatEntity.setOrderNumber(seatInput.getOrderNumber());
        seatEntity.setPriceCategory(seatInput.getPriceCategory());
        seatEntity.setStatus(seatInput.getStatus() != null ? seatInput.getStatus().getValue() : null);
        seatEntity.setSeatRow(rowEntity);
        
        setSeatPosition(seatEntity, seatInput);
        seatRepository.save(seatEntity);
        
        logger.debug("Successfully created seat with ID {} for row {}", 
                    seatEntity.getSeatId(), rowEntity.getName());
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
