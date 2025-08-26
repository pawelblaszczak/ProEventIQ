package dev.knightcore.proeventiq.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;

@Entity
@Table(name = "user_details")
public class UserEntity {
    
    @Id
    @Column(name = "id", length = 50)
    private String id;
    
    @Email
    @Column(name = "email", length = 50, unique = true)
    private String email;
    
    @Column(name = "name", length = 200)
    private String name;
    
    @Column(name = "address", length = 500)
    private String address;
    
    @Lob
    @Column(name = "thumbnail")
    private byte[] thumbnail;
    
    @Column(name = "thumbnail_content_type", length = 100)
    private String thumbnailContentType;

    // Default constructor
    public UserEntity() {}

    // Constructor with required fields
    public UserEntity(String id, String email) {
        this.id = id;
        this.email = email;
    }

    // Getters and setters
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
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

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        UserEntity that = (UserEntity) o;
        return id != null && id.equals(that.id);
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }

    @Override
    public String toString() {
        return "UserEntity{" +
                "id='" + id + '\'' +
                ", email='" + email + '\'' +
                ", name='" + name + '\'' +
                '}';
    }
}
