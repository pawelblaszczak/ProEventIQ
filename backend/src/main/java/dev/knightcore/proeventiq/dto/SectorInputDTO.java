package dev.knightcore.proeventiq.dto;

public record SectorInputDTO(String name, Integer orderNumber, Float positionX, Float positionY, Integer rotation, String priceCategory, String status, Float labelPositionX, Float labelPositionY, Integer labelRotation, Integer labelFontSize, Long sourceSectorId) {}
