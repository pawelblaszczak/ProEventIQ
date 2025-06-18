package dev.knightcore.proeventiq.entity;

import jakarta.persistence.*;
import java.util.List;

@Entity
@Table(name = "seat_row")
public class SeatRowEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long seatRowId;

    private Integer orderNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sector_id")
    private SectorEntity sector;

    @OneToMany(mappedBy = "seatRow", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<SeatEntity> seats;

    // Getters and setters
    public Long getSeatRowId() { return seatRowId; }
    public void setSeatRowId(Long seatRowId) { this.seatRowId = seatRowId; }
    public Integer getOrderNumber() { return orderNumber; }
    public void setOrderNumber(Integer orderNumber) { this.orderNumber = orderNumber; }
    public SectorEntity getSector() { return sector; }
    public void setSector(SectorEntity sector) { this.sector = sector; }
    public List<SeatEntity> getSeats() { return seats; }
    public void setSeats(List<SeatEntity> seats) { this.seats = seats; }
}
