package dev.knightcore.proeventiq.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Pattern;
import java.time.LocalDateTime;

@Entity
@Table(name = "participant")
public class ParticipantEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long participantId;

    @Column(name = "event_id", nullable = false)
    private Long eventId;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "address")
    private String address;

    @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "Seat color must be a valid HEX color code (e.g., #FF5733)")
    @Column(name = "seat_color", length = 7)
    private String seatColor;

    @Column(name = "children_ticket_count", nullable = false)
    private Integer childrenTicketCount = 0;

    @Column(name = "guardian_ticket_count", nullable = false)
    private Integer guardianTicketCount = 0;

    @Column(name = "all_ticket_count", insertable = false, updatable = false)
    private Integer allTicketCount;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // Getters and setters
    public Long getParticipantId() { return participantId; }
    public void setParticipantId(Long participantId) { this.participantId = participantId; }
    public Long getEventId() { return eventId; }
    public void setEventId(Long eventId) { this.eventId = eventId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }
    public String getSeatColor() { return seatColor; }
    public void setSeatColor(String seatColor) { this.seatColor = seatColor; }
    public Integer getChildrenTicketCount() { return childrenTicketCount; }
    public void setChildrenTicketCount(Integer childrenTicketCount) { this.childrenTicketCount = childrenTicketCount; }
    public Integer getGuardianTicketCount() { return guardianTicketCount; }
    public void setGuardianTicketCount(Integer guardianTicketCount) { this.guardianTicketCount = guardianTicketCount; }
    public Integer getAllTicketCount() { return allTicketCount; }
    // No setter for allTicketCount as it is generated
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
