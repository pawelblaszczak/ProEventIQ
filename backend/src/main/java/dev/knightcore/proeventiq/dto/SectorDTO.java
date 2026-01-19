package dev.knightcore.proeventiq.dto;

public record SectorDTO(Long sectorId, String name, Integer orderNumber, Float positionX, Float positionY, Integer rotation, String priceCategory, String status, Long venueId, Float labelPositionX, Float labelPositionY, Integer labelRotation, Integer labelFontSize) {}
