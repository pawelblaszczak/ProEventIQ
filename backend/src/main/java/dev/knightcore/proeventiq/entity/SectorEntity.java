package dev.knightcore.proeventiq.entity;

import jakarta.persistence.*;
import java.util.List;

@Entity
@Table(name = "sector")
public class SectorEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long sectorId;

    private String name;
    private String status;

    private Float positionX;
    private Float positionY;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "venue_id")
    private VenueEntity venue;

    @OneToMany(mappedBy = "sector", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<SeatRowEntity> seatRows;

    // Getters and setters
    public Long getSectorId() { return sectorId; }
    public void setSectorId(Long sectorId) { this.sectorId = sectorId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Float getPositionX() { return positionX; }
    public void setPositionX(Float positionX) { this.positionX = positionX; }
    public Float getPositionY() { return positionY; }
    public void setPositionY(Float positionY) { this.positionY = positionY; }
    public VenueEntity getVenue() { return venue; }
    public void setVenue(VenueEntity venue) { this.venue = venue; }
    public List<SeatRowEntity> getSeatRows() { return seatRows; }
    public void setSeatRows(List<SeatRowEntity> seatRows) { this.seatRows = seatRows; }
}
