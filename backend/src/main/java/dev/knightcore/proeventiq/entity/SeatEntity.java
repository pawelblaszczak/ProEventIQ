package dev.knightcore.proeventiq.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "seat")
public class SeatEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "seat_id")
    private Long seatId;
    
    @Column(name = "order_number")
    private Integer orderNumber;
    
    @Column(name = "position_x")
    private Float positionX;
    
    @Column(name = "position_y")
    private Float positionY;
    
    @Column(name = "price_category")
    private String priceCategory;
    
    private String status;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "seat_row_id")
    private SeatRowEntity seatRow;

    // Getters and setters
    public Long getSeatId() { return seatId; }
    public void setSeatId(Long seatId) { this.seatId = seatId; }
    public Integer getOrderNumber() { return orderNumber; }
    public void setOrderNumber(Integer orderNumber) { this.orderNumber = orderNumber; }
    public Float getPositionX() { return positionX; }
    public void setPositionX(Float positionX) { this.positionX = positionX; }
    public Float getPositionY() { return positionY; }
    public void setPositionY(Float positionY) { this.positionY = positionY; }
    public String getPriceCategory() { return priceCategory; }
    public void setPriceCategory(String priceCategory) { this.priceCategory = priceCategory; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public SeatRowEntity getSeatRow() { return seatRow; }
    public void setSeatRow(SeatRowEntity seatRow) { this.seatRow = seatRow; }
}
