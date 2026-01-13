package dev.knightcore.proeventiq.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.Formula;
import java.time.LocalDateTime;

@Entity
@Table(name = "event")
public class EventEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long eventId;

    private String userName;    
    
    @Column(name = "show_id", nullable = false)
    private Long showId;
    
    @Column(name = "venue_id", nullable = false)
    private Long venueId;
    
    @Column(name = "date_time", nullable = false)
    private LocalDateTime dateTime;
    
    @Column(name = "ticket_description", columnDefinition = "TEXT")
    private String ticketDescription;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "show_id", insertable = false, updatable = false)
    private ShowEntity show;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "venue_id", insertable = false, updatable = false)
    private VenueEntity venue;

    // Has allocation errors computed by DB function: returns 'Y' or 'N'
    @Formula("has_allocation_errors(event_id)")
    private String hasAllocationErrorsRaw;

    @Formula("get_event_ticket_count(event_id)")
    private Integer numberOfTickets;

    @Formula("get_event_blocked_seat_count(event_id)")
    private Integer blockedSeats;

    @Transient
    public Boolean getHasAllocationErrors() {
        if (hasAllocationErrorsRaw == null) return null;
        return "Y".equalsIgnoreCase(hasAllocationErrorsRaw);
    }

    public Integer getNumberOfTickets() {
        return numberOfTickets != null ? numberOfTickets : 0;
    }

    public Integer getBlockedSeats() {
        return blockedSeats != null ? blockedSeats : 0;
    }

    // Constructors
    public EventEntity() {}

    public EventEntity(Long showId, Long venueId, LocalDateTime dateTime) {
        this.showId = showId;
        this.venueId = venueId;
        this.dateTime = dateTime;
    }

    // Getters and setters
    public Long getEventId() {
        return eventId;
    }

    public void setEventId(Long eventId) {
        this.eventId = eventId;
    }

    public String getUserName() {
        return userName;
    }

    public void setUserName(String userName) {
        this.userName = userName;
    }

    public Long getShowId() {
        return showId;
    }

    public void setShowId(Long showId) {
        this.showId = showId;
    }

    public Long getVenueId() {
        return venueId;
    }

    public void setVenueId(Long venueId) {
        this.venueId = venueId;
    }

    public LocalDateTime getDateTime() {
        return dateTime;
    }

    public void setDateTime(LocalDateTime dateTime) {
        this.dateTime = dateTime;
    }

    public String getTicketDescription() {
        return ticketDescription;
    }

    public void setTicketDescription(String ticketDescription) {
        this.ticketDescription = ticketDescription;
    }

    public ShowEntity getShow() {
        return show;
    }

    public void setShow(ShowEntity show) {
        this.show = show;
    }

    public VenueEntity getVenue() {
        return venue;
    }

    public void setVenue(VenueEntity venue) {
        this.venue = venue;
    }
}
