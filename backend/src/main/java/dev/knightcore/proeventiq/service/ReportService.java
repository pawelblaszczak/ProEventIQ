package dev.knightcore.proeventiq.service;

import dev.knightcore.proeventiq.entity.EventEntity;
import dev.knightcore.proeventiq.entity.ParticipantEntity;
import dev.knightcore.proeventiq.entity.ShowEntity;
import dev.knightcore.proeventiq.entity.UserEntity;
import dev.knightcore.proeventiq.entity.VenueEntity;
import dev.knightcore.proeventiq.repository.EventRepository;
import dev.knightcore.proeventiq.repository.ParticipantRepository;
import dev.knightcore.proeventiq.repository.ShowRepository;
import dev.knightcore.proeventiq.repository.UserRepository;
import dev.knightcore.proeventiq.repository.VenueRepository;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.pdfbox.pdmodel.font.PDType0Font;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@Service
public class ReportService {
    
    private static final Logger log = LoggerFactory.getLogger(ReportService.class);
    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    
    private final EventRepository eventRepository;
    private final ParticipantRepository participantRepository;
    private final ShowRepository showRepository;
    private final VenueRepository venueRepository;
    private final UserRepository userRepository;
    private final KeycloakUserService keycloakUserService;
    
    public ReportService(EventRepository eventRepository,
                        ParticipantRepository participantRepository,
                        ShowRepository showRepository,
                        VenueRepository venueRepository,
                        UserRepository userRepository,
                        KeycloakUserService keycloakUserService) {
        this.eventRepository = eventRepository;
        this.participantRepository = participantRepository;
        this.showRepository = showRepository;
        this.venueRepository = venueRepository;
        this.userRepository = userRepository;
        this.keycloakUserService = keycloakUserService;
    }
    
    @Transactional(readOnly = true)
    public Optional<byte[]> generateParticipantReport(Long eventId, Long participantId) {
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
            
            // Fetch current user (organizer) information from Keycloak and user_details table
            UserEntity organizer = null;
            Optional<String> currentUserEmail = keycloakUserService.getCurrentUserEmail();
            if (currentUserEmail.isPresent()) {
                Optional<UserEntity> organizerOpt = userRepository.findByEmail(currentUserEmail.get());
                if (organizerOpt.isPresent()) {
                    organizer = organizerOpt.get();
                } else {
                    log.warn("Organizer not found in user_details table for email: {}", currentUserEmail.get());
                }
            } else {
                log.warn("Could not retrieve current user email from Keycloak");
            }
            
            // Generate PDF
            byte[] pdfBytes = createPdfReport(event, participant, show, venue, organizer);
            return Optional.of(pdfBytes);
            
        } catch (Exception e) {
            log.error("Error generating participant report: {}", e.getMessage(), e);
            return Optional.empty();
        }
    }
    
    private byte[] createPdfReport(EventEntity event, ParticipantEntity participant, ShowEntity show, VenueEntity venue, UserEntity organizer) throws IOException {
        try (PDDocument document = new PDDocument()) {
            PDPage page = new PDPage(PDRectangle.A4);
            document.addPage(page);
            
            try (PDPageContentStream contentStream = new PDPageContentStream(document, page)) {
                // Set up fonts with Unicode support for Polish characters
                PDFont headerFont;
                PDFont bodyFont;
                
                try {
                    // Try to load Arial fonts from Windows system using PDType0Font for full Unicode support
                    java.io.File arialBoldFile = new java.io.File("C:/Windows/Fonts/arialbd.ttf");
                    java.io.File arialFile = new java.io.File("C:/Windows/Fonts/arial.ttf");
                    
                    // Check if font files exist
                    if (!arialBoldFile.exists() || !arialFile.exists()) {
                        throw new IOException("Arial font files not found in Windows/Fonts directory");
                    }
                    
                    // Load fonts using PDType0Font for full Unicode support
                    headerFont = PDType0Font.load(document, arialBoldFile);
                    bodyFont = PDType0Font.load(document, arialFile);
                    
                    log.info("Successfully loaded Arial fonts with PDType0Font and full Unicode support");
                } catch (Exception e) {
                    // Fallback to standard fonts without Polish support
                    log.warn("Could not load Unicode fonts, falling back to standard fonts. Polish characters will be converted to ASCII equivalents: {}", e.getMessage());
                    headerFont = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
                    bodyFont = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
                }
                
                float margin = 50;
                float yPosition = page.getMediaBox().getHeight() - margin;
                float lineHeight = 20;

                // Centered title: Reservation confirmation with organizer logo on the right
                String reportTitle = "Reservation confirmation";
                contentStream.setFont(headerFont, 20);
                float titleWidth = headerFont.getStringWidth(reportTitle) / 1000 * 20;
                float pageWidth = page.getMediaBox().getWidth();
                float titleX = (pageWidth - titleWidth) / 2;
                
                // Save original yPosition for logo alignment
                float titleYPosition = yPosition;
                
                // Draw title
                contentStream.beginText();
                contentStream.newLineAtOffset(titleX, yPosition);
                safeShowText(contentStream, reportTitle);
                contentStream.endText();
                
                // Add organizer logo on the right side, aligned with the title
                if (organizer != null && organizer.getThumbnail() != null && organizer.getThumbnailContentType() != null) {
                    try {
                        PDImageXObject logoImage = PDImageXObject.createFromByteArray(document, organizer.getThumbnail(), "organizer_logo");
                        float logoSize = 80; // Enlarged logo size
                        float logoX = pageWidth - margin - logoSize; // Right aligned
                        float logoY = titleYPosition - logoSize + 15; // Aligned with title
                        contentStream.drawImage(logoImage, logoX, logoY, logoSize, logoSize);
                    } catch (Exception e) {
                        log.warn("Could not load organizer logo: {}", e.getMessage());
                    }
                }
                
                yPosition -= lineHeight + 15;

                // Event organizer section with current user data
                if (organizer != null) {
                    contentStream.setFont(headerFont, 14);
                    contentStream.beginText();
                    contentStream.newLineAtOffset(margin, yPosition);
                    safeShowText(contentStream, "Event organizer");
                    contentStream.endText();
                    yPosition -= lineHeight + 5;

                    // Get current user data from Keycloak
                    String organizerName = keycloakUserService.getCurrentUserFullName().orElse(
                        organizer.getName() != null ? organizer.getName() : "N/A"
                    );
                    String organizerEmail = keycloakUserService.getCurrentUserEmail().orElse("N/A");
                    String organizerAddress = organizer.getAddress() != null ? organizer.getAddress() : "N/A";

                    // Organizer name
                    contentStream.setFont(bodyFont, 12);
                    contentStream.beginText();
                    contentStream.newLineAtOffset(margin + 20, yPosition);
                    safeShowText(contentStream, "Name: " + organizerName);
                    contentStream.endText();
                    yPosition -= lineHeight;
                    
                    // Organizer email
                    contentStream.beginText();
                    contentStream.newLineAtOffset(margin + 20, yPosition);
                    safeShowText(contentStream, "Email: " + organizerEmail);
                    contentStream.endText();
                    yPosition -= lineHeight;
                    
                    // Organizer address
                    contentStream.beginText();
                    contentStream.newLineAtOffset(margin + 20, yPosition);
                    safeShowText(contentStream, "Address: " + organizerAddress);
                    contentStream.endText();
                    yPosition -= lineHeight + 10; // Extra spacing after organizer section
                }

                // Reservation holder label and name
                contentStream.setFont(headerFont, 14);
                contentStream.beginText();
                contentStream.newLineAtOffset(margin, yPosition);
                safeShowText(contentStream, "Reservation holder");
                contentStream.endText();
                yPosition -= lineHeight + 5;

                contentStream.setFont(bodyFont, 14);
                contentStream.beginText();
                contentStream.newLineAtOffset(margin + 20, yPosition);
                safeShowText(contentStream, participant.getName() != null ? participant.getName() : "N/A");
                contentStream.endText();
                yPosition -= lineHeight + 5;

                // Add participant address
                if (participant.getAddress() != null && !participant.getAddress().trim().isEmpty()) {
                    contentStream.setFont(bodyFont, 12);
                    contentStream.beginText();
                    contentStream.newLineAtOffset(margin + 20, yPosition);
                    safeShowText(contentStream, participant.getAddress());
                    contentStream.endText();
                    yPosition -= lineHeight + 10;
                } else {
                    yPosition -= 10;
                }

                // Removed PARTICIPANT INFORMATION section as requested
                
                // Date & location section
                yPosition = addSection(contentStream, headerFont, bodyFont, margin, yPosition, lineHeight,
                    "Date & location", new String[]{
                        "Date & Time: " + (event.getDateTime() != null ? event.getDateTime().format(DATE_TIME_FORMATTER) : "N/A"),
                        "Venue: " + (venue.getName() != null ? venue.getName() : "N/A"),
                        "Address: " + formatAddress(venue)
                    });
                
                // Show information with thumbnail layout
                yPosition = addShowSection(document, contentStream, headerFont, bodyFont, margin, yPosition, lineHeight, show);
                // Removed VENUE INFORMATION section as requested
                
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
    private float addSection(PDPageContentStream contentStream, PDFont headerFont, PDFont bodyFont,
                           float margin, float yPosition, float lineHeight, String title, String[] lines) throws IOException {
        
        // Section title (all section titles same font and size)
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
    
    private float addShowSection(PDDocument document, PDPageContentStream contentStream, 
                               PDFont headerFont, PDFont bodyFont,
                               float margin, float yPosition, float lineHeight, ShowEntity show) throws IOException {
        
        // Section title (all section titles same font and size)
        contentStream.setFont(headerFont, 14);
        contentStream.beginText();
        contentStream.newLineAtOffset(margin, yPosition);
        safeShowText(contentStream, "Show information");
        contentStream.endText();
        yPosition -= lineHeight + 10;
        
        float thumbnailSize = 80;
        float thumbnailX = margin + 20;
        float contentX = thumbnailX + thumbnailSize + 20;
        
        // Draw thumbnail placeholder (rectangle with "THUMBNAIL" text)
        if (show.getThumbnail() != null && show.getThumbnail().length > 0) {
            try {
                PDImageXObject thumbnail = PDImageXObject.createFromByteArray(document, show.getThumbnail(), "thumbnail");
                contentStream.drawImage(thumbnail, thumbnailX, yPosition - thumbnailSize, thumbnailSize, thumbnailSize);
            } catch (Exception e) {
                log.warn("Could not load show thumbnail, using placeholder: {}", e.getMessage());
                drawThumbnailPlaceholder(contentStream, thumbnailX, yPosition - thumbnailSize, thumbnailSize);
            }
        } else {
            drawThumbnailPlaceholder(contentStream, thumbnailX, yPosition - thumbnailSize, thumbnailSize);
        }
        
        // Show name (larger font, to the right of thumbnail)
        contentStream.setFont(headerFont, 16);
        contentStream.beginText();
        contentStream.newLineAtOffset(contentX, yPosition - 20);
        safeShowText(contentStream, show.getName() != null ? show.getName() : "N/A");
        contentStream.endText();
        
        // Show description (smaller font, below show name)
        contentStream.setFont(bodyFont, 10);
        float descriptionY = yPosition - 45;
        String description = show.getDescription() != null ? show.getDescription() : "No description available";
        
        // Word wrap description to fit in available space
        float availableWidth = 400; // Approximate available width
        String[] wrappedLines = wrapText(description, availableWidth, bodyFont, 10);
        
        for (String line : wrappedLines) {
            contentStream.beginText();
            contentStream.newLineAtOffset(contentX, descriptionY);
            safeShowText(contentStream, line);
            contentStream.endText();
            descriptionY -= 12;
            
            // Stop if we've used up the thumbnail space
            if (descriptionY < yPosition - thumbnailSize + 10) {
                break;
            }
        }
        
        // Removed Age Range data as requested
        float sectionEndY = Math.min(yPosition - thumbnailSize - 10, descriptionY - 10);
        return sectionEndY - 20; // Extra spacing between sections
    }
    
    private void drawThumbnailPlaceholder(PDPageContentStream contentStream, float x, float y, float size) throws IOException {
        // Draw border
        contentStream.setStrokingColor(0.8f, 0.8f, 0.8f);
        contentStream.setLineWidth(1);
        contentStream.addRect(x, y, size, size);
        contentStream.stroke();
        
        // Add "THUMBNAIL" text
        contentStream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 8);
        contentStream.beginText();
        contentStream.newLineAtOffset(x + 15, y + size/2 - 4);
        contentStream.showText("THUMBNAIL");
        contentStream.endText();
    }
    
    private String[] wrapText(String text, float maxWidth, PDFont font, int fontSize) {
        if (text == null || text.isEmpty()) {
            return new String[]{"No description available"};
        }
        
        // For width calculation, we need to use sanitized text
        // But we want to return the original text split properly
        String sanitizedForCalculation = replacePolishCharacters(sanitizeText(text));
        
        try {
            String[] originalWords = text.split("\\s+");
            String[] sanitizedWords = sanitizedForCalculation.split("\\s+");
            
            // Make sure both arrays have the same length (they should)
            if (originalWords.length != sanitizedWords.length) {
                log.warn("Word count mismatch after sanitization, using fallback");
                return splitTextIntoChunks(text, 80);
            }
            
            java.util.List<String> lines = new java.util.ArrayList<>();
            StringBuilder currentOriginalLine = new StringBuilder();
            StringBuilder currentSanitizedLine = new StringBuilder();
            
            for (int i = 0; i < originalWords.length; i++) {
                String originalWord = originalWords[i];
                String sanitizedWord = sanitizedWords[i];
                
                String testSanitizedLine = currentSanitizedLine.length() > 0 ? 
                    currentSanitizedLine + " " + sanitizedWord : sanitizedWord;
                String testOriginalLine = currentOriginalLine.length() > 0 ? 
                    currentOriginalLine + " " + originalWord : originalWord;
                
                float textWidth = font.getStringWidth(testSanitizedLine) / 1000 * fontSize;
                
                if (textWidth <= maxWidth) {
                    currentSanitizedLine = new StringBuilder(testSanitizedLine);
                    currentOriginalLine = new StringBuilder(testOriginalLine);
                } else {
                    if (currentOriginalLine.length() > 0) {
                        lines.add(currentOriginalLine.toString());
                        currentSanitizedLine = new StringBuilder(sanitizedWord);
                        currentOriginalLine = new StringBuilder(originalWord);
                    } else {
                        // Word is too long, add it anyway
                        lines.add(originalWord);
                    }
                }
            }
            
            if (currentOriginalLine.length() > 0) {
                lines.add(currentOriginalLine.toString());
            }
            
            return lines.toArray(new String[0]);
        } catch (IOException e) {
            log.warn("Error calculating text width for wrapping: {}", e.getMessage());
            // Fallback: split text into chunks of reasonable length
            return splitTextIntoChunks(text, 80);
        }
    }
    
    private String[] splitTextIntoChunks(String text, int maxChunkLength) {
        if (text == null || text.isEmpty()) {
            return new String[]{"No description available"};
        }
        
        java.util.List<String> chunks = new java.util.ArrayList<>();
        int start = 0;
        
        while (start < text.length()) {
            int end = Math.min(start + maxChunkLength, text.length());
            
            // Try to break at a word boundary if possible
            if (end < text.length()) {
                int lastSpace = text.lastIndexOf(' ', end);
                if (lastSpace > start) {
                    end = lastSpace;
                }
            }
            
            chunks.add(text.substring(start, end).trim());
            start = end + (end < text.length() && text.charAt(end) == ' ' ? 1 : 0);
        }
        
        return chunks.toArray(new String[0]);
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
        if (text == null) {
            contentStream.showText("");
            return;
        }
        
        try {
            // With proper Unicode fonts loaded, try the original text first
            contentStream.showText(text);
            // If we get here, the text was successfully displayed with Polish characters!
        } catch (IllegalArgumentException e) {
            log.warn("Unicode text failed: '{}', trying quote sanitization: {}", text, e.getMessage());
            // If original text fails, try with basic quote sanitization only
            try {
                String basicSanitized = sanitizeText(text);
                contentStream.showText(basicSanitized);
            } catch (IllegalArgumentException e2) {
                log.warn("Quote sanitized text failed: '{}', trying Polish character replacement: {}", text, e2.getMessage());
                // If still failing, try Polish character replacement
                String polishReplaced = replacePolishCharacters(sanitizeText(text));
                try {
                    contentStream.showText(polishReplaced);
                } catch (IllegalArgumentException e3) {
                    // Final fallback: aggressive sanitization
                    log.warn("All text encoding methods failed for: '{}', using aggressive sanitization", text);
                    String aggressivelySanitized = polishReplaced.replaceAll("[^\\x00-\\x7F]", "?");
                    contentStream.showText(aggressivelySanitized);
                }
            }
        }
    }
    
    private String replacePolishCharacters(String text) {
        if (text == null) return "";
        
        return text
            .replace("ą", "a").replace("Ą", "A")
            .replace("ć", "c").replace("Ć", "C")
            .replace("ę", "e").replace("Ę", "E")
            .replace("ł", "l").replace("Ł", "L")
            .replace("ń", "n").replace("Ń", "N")
            .replace("ó", "o").replace("Ó", "O")
            .replace("ś", "s").replace("Ś", "S")
            .replace("ź", "z").replace("Ź", "Z")
            .replace("ż", "z").replace("Ż", "Z");
    }
    
    private String sanitizeText(String text) {
        if (text == null) return "";
        
        // First, handle specific problematic Unicode characters
        String sanitized = text
            // Smart quotes - both opening and closing
            .replace("\u201C", "\"").replace("\u201D", "\"") // Double quotes
            .replace("\u2018", "'").replace("\u2019", "'")   // Single quotes
            .replace("\u201E", "\"").replace("\u201F", "\"") // Other quote variants
            .replace("\u00AB", "\"").replace("\u00BB", "\"") // Guillemets
            // Dashes
            .replace("\u2014", "-").replace("\u2013", "-")   // Em and en dashes
            .replace("\u2015", "-")                          // Horizontal bar
            // Other common symbols
            .replace("\u2026", "...")                        // Ellipsis
            .replace("\u00A0", " ")                          // Non-breaking space
            .replace("\u2022", "-")                          // Bullet point
            .replace("\u00B7", "-")                          // Middle dot
            // Currency symbols
            .replace("€", "EUR").replace("£", "GBP").replace("¥", "JPY")
            // Copyright and trademark
            .replace("©", "(c)").replace("®", "(r)").replace("™", "(tm)");
        
        // For Polish characters, let's try to preserve them first, and only replace if they cause issues
        // We'll handle this in the safeShowText method instead
        return sanitized;
    }
    
    /**
     * Sanitizes text for use in filenames by removing Polish characters and replacing spaces/special chars with underscores
     * @param text the text to sanitize
     * @return sanitized filename-safe text
     */
    private String sanitizeFilename(String text) {
        if (text == null || text.trim().isEmpty()) {
            return "unknown";
        }
        
        // Replace Polish characters first
        String sanitized = replacePolishCharacters(text.trim());
        
        // Replace spaces and special characters with underscores
        sanitized = sanitized.replaceAll("[^a-zA-Z0-9.-]", "_");
        
        // Remove multiple consecutive underscores
        sanitized = sanitized.replaceAll("_{2,}", "_");
        
        // Remove leading/trailing underscores
        sanitized = sanitized.replaceAll("^_+|_+$", "");
        
        // If empty after sanitization, return default
        if (sanitized.isEmpty()) {
            return "unknown";
        }
        
        return sanitized;
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
    
    @Transactional(readOnly = true)
    public Optional<byte[]> generateAllParticipantReportsZip(Long eventId) {
        log.info("Generating ZIP file with all participant reports for event {}", eventId);
        
        try {
            // Check if event exists
            Optional<EventEntity> eventOpt = eventRepository.findById(eventId);
            if (eventOpt.isEmpty()) {
                log.warn("Event not found with ID: {}", eventId);
                return Optional.empty();
            }
            
            // Get all participants for the event
            List<ParticipantEntity> participants = participantRepository.findByEventId(eventId);
            if (participants.isEmpty()) {
                log.warn("No participants found for event {}", eventId);
                return Optional.empty();
            }
            
            // Create ZIP file in memory
            ByteArrayOutputStream zipOutput = new ByteArrayOutputStream();
            try (ZipOutputStream zipStream = new ZipOutputStream(zipOutput)) {
                
                for (ParticipantEntity participant : participants) {
                    try {
                        // Generate individual participant report
                        Optional<byte[]> reportBytes = generateParticipantReport(eventId, participant.getParticipantId());
                        
                        if (reportBytes.isPresent()) {
                            // Create ZIP entry for this participant report using centralized filename logic
                            String fileName = generateParticipantReportFilename(eventId, participant.getParticipantId());
                            ZipEntry zipEntry = new ZipEntry(fileName);
                            zipStream.putNextEntry(zipEntry);
                            zipStream.write(reportBytes.get());
                            zipStream.closeEntry();
                            
                            log.debug("Added report for participant {} to ZIP", participant.getParticipantId());
                        } else {
                            log.warn("Failed to generate report for participant {}", participant.getParticipantId());
                        }
                    } catch (Exception e) {
                        log.error("Error generating report for participant {}: {}", participant.getParticipantId(), e.getMessage());
                        // Continue with other participants even if one fails
                    }
                }
            }
            
            byte[] zipBytes = zipOutput.toByteArray();
            log.info("Successfully generated ZIP file with {} participants for event {}", participants.size(), eventId);
            return Optional.of(zipBytes);
            
        } catch (Exception e) {
            log.error("Error generating ZIP file of participant reports for event {}: {}", eventId, e.getMessage(), e);
            return Optional.empty();
        }
    }

    /**
     * Generates a standardized filename for a single participant report
     * @param eventId the event ID
     * @param participantId the participant ID
     * @return formatted filename for the participant report
     */
    public String generateParticipantReportFilename(Long eventId, Long participantId) {
        try {
            // Fetch all required data for filename generation
            Optional<EventEntity> eventOpt = eventRepository.findById(eventId);
            Optional<ParticipantEntity> participantOpt = participantRepository.findByParticipantIdAndEventId(participantId, eventId);
            
            if (eventOpt.isEmpty() || participantOpt.isEmpty()) {
                log.warn("Event or participant not found for filename generation - eventId: {}, participantId: {}", eventId, participantId);
                return String.format("participant_report_%s_event_%d.pdf", participantId, eventId);
            }
            
            EventEntity event = eventOpt.get();
            ParticipantEntity participant = participantOpt.get();
            
            Optional<ShowEntity> showOpt = showRepository.findById(event.getShowId());
            if (showOpt.isEmpty()) {
                log.warn("Show not found for filename generation - eventId: {}", eventId);
                return String.format("participant_report_%s_event_%d.pdf", participantId, eventId);
            }
            
            ShowEntity show = showOpt.get();
            
            // Generate filename: participant_name_date_show_name.pdf
            String participantName = sanitizeFilename(participant.getName() != null ? participant.getName() : "unknown");
            String showName = sanitizeFilename(show.getName() != null ? show.getName() : "unknown_show");
            String date = event.getDateTime() != null ? 
                event.getDateTime().format(DateTimeFormatter.ofPattern("yyyy_MM_dd")) : "unknown_date";
            
            return String.format("%s_%s_%s.pdf", participantName, date, showName);
            
        } catch (Exception e) {
            log.error("Error generating filename for participant report: {}", e.getMessage());
            // Fallback to simple format
            return String.format("participant_report_%s_event_%d.pdf", participantId, eventId);
        }
    }

    /**
     * Generates a standardized filename for the ZIP file containing all participant reports
     * @param eventId the event ID
     * @return formatted filename for the ZIP file
     */
    public String generateParticipantReportsZipFilename(Long eventId) {
        try {
            // Fetch event and show
            Optional<EventEntity> eventOpt = eventRepository.findById(eventId);
            if (eventOpt.isEmpty()) {
                log.warn("Event not found for ZIP filename generation - eventId: {}", eventId);
                return String.format("event_%d.zip", eventId);
            }
            EventEntity event = eventOpt.get();
            Optional<ShowEntity> showOpt = showRepository.findById(event.getShowId());
            String showName = showOpt.isPresent() ? showOpt.get().getName() : "unknown_show";
            String date = event.getDateTime() != null ?
                event.getDateTime().format(java.time.format.DateTimeFormatter.ofPattern("yyyy_MM_dd")) : "unknown_date";
            // Remove Polish chars and replace spaces with underscores
            String sanitizedShowName = sanitizeFilename(showName);
            return String.format("%s_%s.zip", date, sanitizedShowName);
        } catch (Exception e) {
            log.error("Error generating ZIP filename: {}", e.getMessage());
            return String.format("event_%d.zip", eventId);
        }
    }
    
    private float addOrganizerTextOnly(PDPageContentStream contentStream, PDFont bodyFont, float margin, float yPosition, float lineHeight, UserEntity organizer) throws IOException {
        // Organizer name
        contentStream.setFont(bodyFont, 12);
        contentStream.beginText();
        contentStream.newLineAtOffset(margin + 20, yPosition);
        safeShowText(contentStream, organizer.getName() != null ? organizer.getName() : "N/A");
        contentStream.endText();
        yPosition -= lineHeight;
        
        // Organizer address
        contentStream.beginText();
        contentStream.newLineAtOffset(margin + 20, yPosition);
        safeShowText(contentStream, organizer.getAddress() != null ? organizer.getAddress() : "N/A");
        contentStream.endText();
        yPosition -= lineHeight;
        
        return yPosition;
    }
}
