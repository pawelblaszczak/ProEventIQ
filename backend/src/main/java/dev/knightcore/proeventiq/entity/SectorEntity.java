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
    private String position;
    private String status;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "venue_id")
    private VenueEntity venue;

    @OneToMany(mappedBy = "sector", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<RowEntity> rows;

    // Getters and setters
    public Long getSectorId() { return sectorId; }
    public void setSectorId(Long sectorId) { this.sectorId = sectorId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getPosition() { return position; }
    public void setPosition(String position) { this.position = position; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public VenueEntity getVenue() { return venue; }
    public void setVenue(VenueEntity venue) { this.venue = venue; }
    public List<RowEntity> getRows() { return rows; }
    public void setRows(List<RowEntity> rows) { this.rows = rows; }
}
