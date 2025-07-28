package dev.knightcore.proeventiq.service;

import dev.knightcore.proeventiq.entity.EventEntity;
import dev.knightcore.proeventiq.entity.ParticipantEntity;
import dev.knightcore.proeventiq.entity.ShowEntity;
import dev.knightcore.proeventiq.entity.VenueEntity;
import dev.knightcore.proeventiq.repository.EventRepository;
import dev.knightcore.proeventiq.repository.ParticipantRepository;
import dev.knightcore.proeventiq.repository.ShowRepository;
import dev.knightcore.proeventiq.repository.VenueRepository;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.format.DateTimeFormatter;
import java.util.Optional;

@Service
public class ReportService {
    
    private static final Logger log = LoggerFactory.getLogger(ReportService.class);
    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    
    private final EventRepository eventRepository;
    private final ParticipantRepository participantRepository;
    private final ShowRepository showRepository;
    private final VenueRepository venueRepository;
    
    public ReportService(EventRepository eventRepository,
                        ParticipantRepository participantRepository,
                        ShowRepository showRepository,
                        VenueRepository venueRepository) {
        this.eventRepository = eventRepository;
        this.participantRepository = participantRepository;
        this.showRepository = showRepository;
        this.venueRepository = venueRepository;
    }
    
    @Transactional(readOnly = true)
    public Optional<byte[]> generateParticipantReport(Long eventId, String participantId) {
        log.info("Generating PDF report for participant {} in event {}", participantId, eventId);
        
        try {
            // Fetch all required data
            Optional<EventEntity> eventOpt = eventRepository.findById(eventId);
            Optional<ParticipantEntity> participantOpt = participantRepository.findByParticipantIdAndEventId(participantId, eventId);
            
            if (eventOpt.isEmpty() || participantOpt.isEmpty()) {
                log.warn("Event or participant not found - eventId: {}, participantId: {}", eventId, participantId);
                return Optional.empty();
            }
            
            EventEntity event = eventOpt.get();
            ParticipantEntity participant = participantOpt.get();
            
            Optional<ShowEntity> showOpt = showRepository.findById(event.getShowId());
            Optional<VenueEntity> venueOpt = venueRepository.findById(event.getVenueId());
            
            if (showOpt.isEmpty() || venueOpt.isEmpty()) {
                log.warn("Show or venue not found for event {}", eventId);
                return Optional.empty();
            }
            
            ShowEntity show = showOpt.get();
            VenueEntity venue = venueOpt.get();
            
            // Generate PDF
            byte[] pdfBytes = createPdfReport(event, participant, show, venue);
            return Optional.of(pdfBytes);
            
        } catch (Exception e) {
            log.error("Error generating participant report: {}", e.getMessage(), e);
            return Optional.empty();
        }
    }
    
    private byte[] createPdfReport(EventEntity event, ParticipantEntity participant, ShowEntity show, VenueEntity venue) throws IOException {
        try (PDDocument document = new PDDocument()) {
            PDPage page = new PDPage(PDRectangle.A4);
            document.addPage(page);
            
            try (PDPageContentStream contentStream = new PDPageContentStream(document, page)) {
                // Set up fonts
                PDType1Font titleFont = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
                PDType1Font headerFont = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
                PDType1Font bodyFont = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
                
                float margin = 50;
                float yPosition = page.getMediaBox().getHeight() - margin;
                float lineHeight = 20;
                
                // Title
                contentStream.setFont(titleFont, 24);
                contentStream.beginText();
                contentStream.newLineAtOffset(margin, yPosition);
                safeShowText(contentStream, "ProEventIQ - Event Participation Report");
                contentStream.endText();
                yPosition -= 40;
                
                // Participant Information
                yPosition = addSection(contentStream, headerFont, bodyFont, margin, yPosition, lineHeight,
                    "PARTICIPANT INFORMATION", new String[]{
                        "Name: " + sanitizeText(participant.getName()),
                        "Participant ID: " + sanitizeText(participant.getParticipantId()),
                        "Number of Tickets: " + participant.getNumberOfTickets(),
                        "Registration Date: " + (participant.getCreatedAt() != null ? 
                            participant.getCreatedAt().format(DATE_TIME_FORMATTER) : "N/A")
                    });
                
                // Event Information
                yPosition = addSection(contentStream, headerFont, bodyFont, margin, yPosition, lineHeight,
                    "EVENT INFORMATION", new String[]{
                        "Event ID: " + event.getEventId(),
                        "Event Date & Time: " + (event.getDateTime() != null ? 
                            event.getDateTime().format(DATE_TIME_FORMATTER) : "N/A")
                    });
                
                // Show Information
                yPosition = addSection(contentStream, headerFont, bodyFont, margin, yPosition, lineHeight,
                    "SHOW INFORMATION", new String[]{
                        "Show Name: " + (show.getName() != null ? sanitizeText(show.getName()) : "N/A"),
                        "Description: " + (show.getDescription() != null ? 
                            sanitizeText(truncateText(show.getDescription(), 80)) : "N/A"),
                        "Age Range: " + formatAgeRange(show.getAgeFrom(), show.getAgeTo())
                    });
                
                // Venue Information
                yPosition = addSection(contentStream, headerFont, bodyFont, margin, yPosition, lineHeight,
                    "VENUE INFORMATION", new String[]{
                        "Venue Name: " + (venue.getName() != null ? sanitizeText(venue.getName()) : "N/A"),
                        "Address: " + sanitizeText(formatAddress(venue)),
                        "Description: " + (venue.getDescription() != null ? 
                            sanitizeText(truncateText(venue.getDescription(), 80)) : "N/A")
                    });
                
                // Footer
                yPosition -= 30;
                contentStream.setFont(bodyFont, 10);
                contentStream.beginText();
                contentStream.newLineAtOffset(margin, yPosition);
                safeShowText(contentStream, "Report generated on: " + java.time.LocalDateTime.now().format(DATE_TIME_FORMATTER));
                contentStream.endText();
                
                yPosition -= 15;
                contentStream.beginText();
                contentStream.newLineAtOffset(margin, yPosition);
                safeShowText(contentStream, "ProEventIQ - Event Management System");
                contentStream.endText();
            }
            
            // Convert to byte array
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            document.save(baos);
            return baos.toByteArray();
        }
    }
    
    @SuppressWarnings("java:S107") // More than 7 parameters
    private float addSection(PDPageContentStream contentStream, PDType1Font headerFont, PDType1Font bodyFont,
                           float margin, float yPosition, float lineHeight, String title, String[] lines) throws IOException {
        
        // Section title
        contentStream.setFont(headerFont, 14);
        contentStream.beginText();
        contentStream.newLineAtOffset(margin, yPosition);
        safeShowText(contentStream, title);
        contentStream.endText();
        yPosition -= lineHeight + 5;
        
        // Section content
        contentStream.setFont(bodyFont, 12);
        for (String line : lines) {
            yPosition = addTextLine(contentStream, margin + 20, yPosition, line, lineHeight);
        }
        
        return yPosition - 10; // Extra spacing between sections
    }
    
    private float addTextLine(PDPageContentStream contentStream, float xPosition, float yPosition, 
                             String text, float lineHeight) throws IOException {
        contentStream.beginText();
        contentStream.newLineAtOffset(xPosition, yPosition);
        safeShowText(contentStream, text);
        contentStream.endText();
        return yPosition - lineHeight;
    }
    
    private void safeShowText(PDPageContentStream contentStream, String text) throws IOException {
        try {
            contentStream.showText(text);
        } catch (IllegalArgumentException e) {
            // If text contains unsupported characters, sanitize and try again
            log.warn("Text contains unsupported characters, sanitizing: {}", e.getMessage());
            contentStream.showText(sanitizeText(text));
        }
    }
    
    private String sanitizeText(String text) {
        if (text == null) return "";
        
        // Replace Polish and other special characters with ASCII equivalents
        return text
            .replace("ą", "a").replace("Ą", "A")
            .replace("ć", "c").replace("Ć", "C")
            .replace("ę", "e").replace("Ę", "E")
            .replace("ł", "l").replace("Ł", "L")
            .replace("ń", "n").replace("Ń", "N")
            .replace("ó", "o").replace("Ó", "O")
            .replace("ś", "s").replace("Ś", "S")
            .replace("ź", "z").replace("Ź", "Z")
            .replace("ż", "z").replace("Ż", "Z")
            // Add other common special characters
            .replace("€", "EUR")
            .replace("£", "GBP")
            .replace("¥", "JPY")
            .replace("©", "(c)")
            .replace("®", "(r)")
            .replace("™", "(tm)")
            .replace("\u201C", "\"").replace("\u201D", "\"") // Smart quotes
            .replace("\u2018", "'").replace("\u2019", "'") // Smart apostrophes
            .replace("\u2014", "-").replace("\u2013", "-") // Em and en dashes
            .replace("\u2026", "...") // Ellipsis
            // Remove any remaining characters that might cause issues
            .replaceAll("[^\\x00-\\x7F]", "?"); // Replace non-ASCII characters with ?
    }
    
    private String formatAddress(VenueEntity venue) {
        StringBuilder address = new StringBuilder();
        if (venue.getAddress() != null) {
            address.append(venue.getAddress());
        }
        if (venue.getCity() != null) {
            if (!address.isEmpty()) address.append(", ");
            address.append(venue.getCity());
        }
        if (venue.getCountry() != null) {
            if (!address.isEmpty()) address.append(", ");
            address.append(venue.getCountry());
        }
        return !address.isEmpty() ? address.toString() : "N/A";
    }
    
    private String formatAgeRange(Integer ageFrom, Integer ageTo) {
        if (ageFrom != null && ageTo != null) {
            return ageFrom + " - " + ageTo + " years";
        } else if (ageFrom != null) {
            return ageFrom + "+ years";
        } else if (ageTo != null) {
            return "Up to " + ageTo + " years";
        }
        return "All ages";
    }
    
    private String truncateText(String text, int maxLength) {
        if (text == null) return "N/A";
        if (text.length() <= maxLength) return text;
        return text.substring(0, maxLength - 3) + "...";
    }
}
