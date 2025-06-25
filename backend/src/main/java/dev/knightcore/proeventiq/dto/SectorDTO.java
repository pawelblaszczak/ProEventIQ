package dev.knightcore.proeventiq.dto;

public record SectorDTO(Long sectorId, String name, Integer order, Float positionX, Float positionY, Integer rotation, String priceCategory, String status, Long venueId) {}
