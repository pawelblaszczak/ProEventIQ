package dev.knightcore.proeventiq.entity;

import jakarta.persistence.*;
import java.util.List;

@Entity
@Table(name = "venue")
public class VenueEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long venueId;
    
    private String userName;
    private String name;
    private String country;
    private String city;
    private String address;
    
    @Lob
    private byte[] thumbnail;
    
    private String thumbnailContentType;
    private String description;
    
    private Double width;
    private Double height;

    @OneToMany(mappedBy = "venue", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<SectorEntity> sectors;

    // Getters and setters
    public Long getVenueId() { return venueId; }
    public void setVenueId(Long venueId) { this.venueId = venueId; }
    public String getUserName() { return userName; }
    public void setUserName(String userName) { this.userName = userName; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getCountry() { return country; }
    public void setCountry(String country) { this.country = country; }
    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }
    public byte[] getThumbnail() { return thumbnail; }
    public void setThumbnail(byte[] thumbnail) { this.thumbnail = thumbnail; }
    public String getThumbnailContentType() { return thumbnailContentType; }
    public void setThumbnailContentType(String thumbnailContentType) { this.thumbnailContentType = thumbnailContentType; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public Double getWidth() { return width; }
    public void setWidth(Double width) { this.width = width; }
    public Double getHeight() { return height; }
    public void setHeight(Double height) { this.height = height; }
    public List<SectorEntity> getSectors() { return sectors; }
    public void setSectors(List<SectorEntity> sectors) { this.sectors = sectors; }
}
