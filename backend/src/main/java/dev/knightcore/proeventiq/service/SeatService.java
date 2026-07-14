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

import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
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

        List<SeatRowInput> safeRowInputs = rowInputs != null ? rowInputs : List.of();
        
        // First, handle potential conflicts by temporarily updating order numbers
        handleOrderNumberConflicts(existingRows, safeRowInputs);

        Set<Long> matchedRowIds = new HashSet<>();
        boolean payloadContainsRowIds = safeRowInputs.stream().anyMatch(input -> input.getSeatRowId() != null);
        
        // Update or create rows
        for (SeatRowInput rowInput : safeRowInputs) {
            SeatRowEntity existingRow = findExistingRow(existingRows, rowInput, sector);
            
            if (existingRow != null) {
                logger.debug("Updating existing row: {} (order: {})", rowInput.getName(), rowInput.getOrderNumber());
                updateExistingRow(existingRow, rowInput);
                matchedRowIds.add(existingRow.getSeatRowId());
            } else {
                logger.debug("Creating new row: {} (order: {})", rowInput.getName(), rowInput.getOrderNumber());
                SeatRowEntity newRow = createNewRow(sector, rowInput);
                matchedRowIds.add(newRow.getSeatRowId());
            }
        }
        
        // Remove rows that are no longer in the input
        removeObsoleteRows(existingRows, matchedRowIds, payloadContainsRowIds, safeRowInputs);
    }

    private void handleOrderNumberConflicts(List<SeatRowEntity> existingRows, List<SeatRowInput> rowInputs) {
        // Create a map of desired order numbers from input
        Set<Integer> desiredOrderNumbers = rowInputs.stream()
                .map(SeatRowInput::getOrderNumber)
                .filter(Objects::nonNull)
                .collect(java.util.stream.Collectors.toSet());
        
        // Temporarily assign negative order numbers to existing rows that would conflict
        for (SeatRowEntity existingRow : existingRows) {
            Integer currentOrder = existingRow.getOrderNumber();
            if (currentOrder != null && desiredOrderNumbers.contains(currentOrder)) {
                // Check if this existing row should keep this order number
                boolean shouldKeepOrder = rowInputs.stream()
                    .anyMatch(input -> input.getSeatRowId() != null
                        && input.getSeatRowId().equals(existingRow.getSeatRowId()));

                if (!shouldKeepOrder) {
                    // Legacy fallback for clients without row IDs: treat same name as the same row.
                    shouldKeepOrder = rowInputs.stream()
                        .anyMatch(input -> input.getSeatRowId() == null
                            && currentOrder.equals(input.getOrderNumber())
                            && Objects.equals(input.getName(), existingRow.getName()));
                }
                
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

    private SeatRowEntity findExistingRow(List<SeatRowEntity> existingRows, SeatRowInput rowInput, SectorEntity sector) {
        // Match by row ID whenever available to preserve row identity across renumbering.
        if (rowInput.getSeatRowId() != null) {
            SeatRowEntity rowById = existingRows.stream()
                    .filter(row -> rowInput.getSeatRowId().equals(row.getSeatRowId()))
                    .findFirst()
                    .orElse(null);
            if (rowById != null) {
                return rowById;
            }
        }

        // Fallback to name for legacy payloads.
        if (rowInput.getName() != null) {
            SeatRowEntity rowByName = existingRows.stream()
                    .filter(row -> row.getSector().equals(sector)
                            && rowInput.getName().equals(row.getName()))
                    .findFirst()
                    .orElse(null);
            if (rowByName != null) {
                return rowByName;
            }
        }

        // Last resort: order number.
        if (rowInput.getOrderNumber() != null) {
            SeatRowEntity rowByOrder = existingRows.stream()
                    .filter(row -> row.getSector().equals(sector)
                            && rowInput.getOrderNumber().equals(row.getOrderNumber()))
                    .findFirst()
                    .orElse(null);
            if (rowByOrder != null) {
                return rowByOrder;
            }
        }

        return null;
    }

    private void updateExistingRow(SeatRowEntity existingRow, SeatRowInput rowInput) {
        // Update row properties
        existingRow.setName(rowInput.getName());
        existingRow.setOrderNumber(rowInput.getOrderNumber());
        
        seatRowRepository.save(existingRow);
        
        // Update seats for this row
        mergeSeatsForRow(existingRow, rowInput.getSeats());
    }

    private SeatRowEntity createNewRow(SectorEntity sector, SeatRowInput rowInput) {
        SeatRowEntity rowEntity = createSeatRow(sector, rowInput);
        createSeatsForRow(rowEntity, rowInput.getSeats());
        return rowEntity;
    }

    private void removeObsoleteRows(List<SeatRowEntity> existingRows,
                                    Set<Long> matchedRowIds,
                                    boolean payloadContainsRowIds,
                                    List<SeatRowInput> safeRowInputs) {
        Set<Integer> desiredOrders = safeRowInputs.stream()
                .map(SeatRowInput::getOrderNumber)
                .filter(Objects::nonNull)
                .collect(java.util.stream.Collectors.toSet());

        for (SeatRowEntity existingRow : existingRows) {
            boolean stillExists = matchedRowIds.contains(existingRow.getSeatRowId())
                    || (!payloadContainsRowIds
                    && existingRow.getOrderNumber() != null
                    && desiredOrders.contains(existingRow.getOrderNumber()));
            
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

        List<SeatInput> safeSeatInputs = seatInputs != null ? seatInputs : List.of();
        normalizeSeatOrderNumbers(safeSeatInputs);
        boolean payloadContainsSeatIds = safeSeatInputs.stream().anyMatch(input -> input.getSeatId() != null);

        Map<Long, SeatEntity> existingSeatsById = new HashMap<>();
        Map<Integer, SeatEntity> existingSeatsByOrder = new HashMap<>();
        for (SeatEntity existingSeat : existingSeats) {
            if (existingSeat.getSeatId() != null) {
                existingSeatsById.put(existingSeat.getSeatId(), existingSeat);
            }
            if (existingSeat.getOrderNumber() != null) {
                existingSeatsByOrder.put(existingSeat.getOrderNumber(), existingSeat);
            }
        }

        Set<Long> matchedSeatIds = new HashSet<>();
        Set<Integer> desiredOrders = new HashSet<>();
        Map<SeatEntity, SeatInput> matchedSeatUpdates = new HashMap<>();
        List<SeatInput> seatsToCreate = new java.util.ArrayList<>();

        for (SeatInput seatInput : safeSeatInputs) {
            Integer desiredOrder = seatInput.getOrderNumber();
            if (desiredOrder == null) {
                continue;
            }

            desiredOrders.add(desiredOrder);
            SeatEntity existingSeat = null;
            if (seatInput.getSeatId() != null) {
                existingSeat = existingSeatsById.get(seatInput.getSeatId());
            }
            if (existingSeat == null) {
                existingSeat = existingSeatsByOrder.get(desiredOrder);
            }

            if (existingSeat != null) {
                matchedSeatIds.add(existingSeat.getSeatId());
                matchedSeatUpdates.put(existingSeat, seatInput);
            } else {
                seatsToCreate.add(seatInput);
            }
        }
        
        // Delete only seats removed from payload.
        for (SeatEntity existingSeat : existingSeats) {
            Integer existingOrder = existingSeat.getOrderNumber();
            boolean shouldDelete = !matchedSeatIds.contains(existingSeat.getSeatId());
            if (!payloadContainsSeatIds) {
                shouldDelete = existingOrder == null || !desiredOrders.contains(existingOrder);
            }

            if (shouldDelete) {
                seatRepository.delete(existingSeat);
            }
        }

        entityManager.flush();

        // To avoid unique key collisions during in-row renumbering,
        // first move changed seats to temporary negative order numbers.
        int temporaryOrder = -1;
        for (Map.Entry<SeatEntity, SeatInput> updateEntry : matchedSeatUpdates.entrySet()) {
            SeatEntity existingSeat = updateEntry.getKey();
            Integer targetOrder = updateEntry.getValue().getOrderNumber();
            if (targetOrder != null && !targetOrder.equals(existingSeat.getOrderNumber())) {
                existingSeat.setOrderNumber(temporaryOrder--);
                seatRepository.save(existingSeat);
            }
        }

        entityManager.flush();

        for (Map.Entry<SeatEntity, SeatInput> updateEntry : matchedSeatUpdates.entrySet()) {
            updateSeat(updateEntry.getKey(), rowEntity, updateEntry.getValue());
            seatRepository.save(updateEntry.getKey());
        }

        for (SeatInput seatInput : seatsToCreate) {
            createSeat(rowEntity, seatInput);
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
        updateSeat(seatEntity, rowEntity, seatInput);
        seatRepository.save(seatEntity);
        
        logger.debug("Successfully created seat with ID {} for row {}", 
                    seatEntity.getSeatId(), rowEntity.getName());
    }

    private void updateSeat(SeatEntity seatEntity, SeatRowEntity rowEntity, SeatInput seatInput) {
        seatEntity.setOrderNumber(seatInput.getOrderNumber());
        seatEntity.setSeatLabel(seatInput.getSeatLabel().orElse(null));
        seatEntity.setPriceCategory(seatInput.getPriceCategory());
        seatEntity.setStatus(seatInput.getStatus() != null ? seatInput.getStatus().getValue() : null);
        seatEntity.setSeatRow(rowEntity);
        
        setSeatPosition(seatEntity, seatInput);
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
