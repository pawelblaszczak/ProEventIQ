package dev.knightcore.proeventiq.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "seat")
public class SeatEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long seatId;

    private String position;
    private String status;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "row_id")
    private RowEntity row;

    // Getters and setters
    public Long getSeatId() { return seatId; }
    public void setSeatId(Long seatId) { this.seatId = seatId; }
    public String getPosition() { return position; }
    public void setPosition(String position) { this.position = position; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public RowEntity getRow() { return row; }
    public void setRow(RowEntity row) { this.row = row; }
}
