package dev.knightcore.proeventiq.entity;

import jakarta.persistence.*;
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
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "show_id", insertable = false, updatable = false)
    private ShowEntity show;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "venue_id", insertable = false, updatable = false)
    private VenueEntity venue;

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
