package dev.knightcore.proeventiq.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "event_show")
public class ShowEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long showId;
    
    private String userName;
    private String name;
    
    @Lob
    private byte[] thumbnail;
    
    private String thumbnailContentType;
    
    @Lob
    private String description;
    private Integer ageFrom;
    private Integer ageTo;

    // Constructors
    public ShowEntity() {}

    public ShowEntity(String name, String description, Integer ageFrom, Integer ageTo) {
        this.name = name;
        this.description = description;
        this.ageFrom = ageFrom;
        this.ageTo = ageTo;
    }

    // Getters and setters
    public Long getShowId() { 
        return showId; 
    }
    
    public void setShowId(Long showId) { 
        this.showId = showId; 
    }

    public String getUserName() {
        return userName;
    }

    public void setUserName(String userName) {
        this.userName = userName;
    }
    
    public String getName() { 
        return name; 
    }
    
    public void setName(String name) { 
        this.name = name; 
    }
    
    public byte[] getThumbnail() { 
        return thumbnail; 
    }
    
    public void setThumbnail(byte[] thumbnail) { 
        this.thumbnail = thumbnail; 
    }
    
    public String getThumbnailContentType() { 
        return thumbnailContentType; 
    }
    
    public void setThumbnailContentType(String thumbnailContentType) { 
        this.thumbnailContentType = thumbnailContentType; 
    }
    
    public String getDescription() { 
        return description; 
    }
    
    public void setDescription(String description) { 
        this.description = description; 
    }
    
    public Integer getAgeFrom() { 
        return ageFrom; 
    }
    
    public void setAgeFrom(Integer ageFrom) { 
        this.ageFrom = ageFrom; 
    }
    
    public Integer getAgeTo() { 
        return ageTo; 
    }
    
    public void setAgeTo(Integer ageTo) { 
        this.ageTo = ageTo; 
    }
}
