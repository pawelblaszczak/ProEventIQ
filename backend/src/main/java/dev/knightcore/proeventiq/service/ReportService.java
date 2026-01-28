package dev.knightcore.proeventiq.service;

import dev.knightcore.proeventiq.api.model.Event;
import dev.knightcore.proeventiq.entity.EventEntity;
import dev.knightcore.proeventiq.entity.ParticipantEntity;
import dev.knightcore.proeventiq.entity.ReservationEntity;
import dev.knightcore.proeventiq.entity.SeatEntity;
import dev.knightcore.proeventiq.entity.SeatRowEntity;
import dev.knightcore.proeventiq.entity.SectorEntity;
import dev.knightcore.proeventiq.entity.ShowEntity;
import dev.knightcore.proeventiq.entity.UserEntity;
import dev.knightcore.proeventiq.entity.VenueEntity;
import dev.knightcore.proeventiq.repository.EventRepository;
import dev.knightcore.proeventiq.repository.ParticipantRepository;
import dev.knightcore.proeventiq.repository.ShowRepository;
import dev.knightcore.proeventiq.repository.UserRepository;
import dev.knightcore.proeventiq.repository.VenueRepository;
import dev.knightcore.proeventiq.repository.ReservationRepository;
import dev.knightcore.proeventiq.repository.SeatRepository;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.pdfbox.pdmodel.font.PDType0Font;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.apache.pdfbox.pdmodel.graphics.image.LosslessFactory;
import org.apache.pdfbox.pdmodel.graphics.state.RenderingMode;
import javax.imageio.ImageIO;
import javax.imageio.spi.IIORegistry;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import org.apache.batik.transcoder.TranscoderInput;
import org.apache.batik.transcoder.TranscoderException;
import org.apache.batik.transcoder.TranscoderOutput;
import org.apache.batik.transcoder.image.PNGTranscoder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.stream.Collectors;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@Service
public class ReportService {
    
    private static final Logger log = LoggerFactory.getLogger(ReportService.class);
    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    
    // Static initializer to ensure ImageIO plugins (including WebP) are discovered
    static {
        try {
            ImageIO.scanForPlugins();
            log.info("ImageIO plugins scanned - available readers: {}", 
                String.join(", ", ImageIO.getReaderFormatNames()));
        } catch (Exception e) {
            log.warn("Failed to scan ImageIO plugins", e);
        }
    }
    
    private final EventRepository eventRepository;
    private final ParticipantRepository participantRepository;
    private final ShowRepository showRepository;
    private final VenueRepository venueRepository;
    private final ReservationRepository reservationRepository;
    private final SeatRepository seatRepository;
    private final UserRepository userRepository;
    private final KeycloakUserService keycloakUserService;
    
    public ReportService(EventRepository eventRepository,
                        ParticipantRepository participantRepository,
                        ShowRepository showRepository,
                        VenueRepository venueRepository,
                        ReservationRepository reservationRepository,
                        SeatRepository seatRepository,
                        UserRepository userRepository,
                        KeycloakUserService keycloakUserService) {
        this.eventRepository = eventRepository;
        this.participantRepository = participantRepository;
        this.showRepository = showRepository;
        this.venueRepository = venueRepository;
        this.reservationRepository = reservationRepository;
        this.seatRepository = seatRepository;
        this.userRepository = userRepository;
        this.keycloakUserService = keycloakUserService;
    }

    private static class PageState {
        PDPage page;
        PDPageContentStream contentStream;
        float yPosition;
        PageState(PDPage p, PDPageContentStream cs, float y) { this.page = p; this.contentStream = cs; this.yPosition = y; }
    }

    private static class RowKey implements Comparable<RowKey> {
        final String name;
        final Integer orderNumber;

        public RowKey(String name, Integer orderNumber) {
            this.name = name;
            this.orderNumber = orderNumber;
        }

        @Override
        public int compareTo(RowKey other) {
            if (this.orderNumber != null && other.orderNumber != null) {
                int cmp = this.orderNumber.compareTo(other.orderNumber);
                if (cmp != 0) return cmp;
            }
            if (this.name != null && other.name != null) {
                return this.name.compareTo(other.name);
            }
            if (this.name == null && other.name == null) return 0;
            return this.name == null ? 1 : -1;
        }

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (!(o instanceof RowKey)) return false;
            RowKey rowKey = (RowKey) o;
            return java.util.Objects.equals(name, rowKey.name) &&
                   java.util.Objects.equals(orderNumber, rowKey.orderNumber);
        }

        @Override
        public int hashCode() {
            return java.util.Objects.hash(name, orderNumber);
        }

        @Override
        public String toString() {
            return name;
        }
    }

    private PageState ensurePageHasSpace(PDDocument document, PDPage page, PDPageContentStream contentStream, float margin, float yPosition, int requiredHeight) throws IOException {
        if (yPosition - requiredHeight < margin) {
            try { if (contentStream != null) contentStream.close(); } catch (Exception ignored) {}
            PDPage newPage = new PDPage(PDRectangle.A4);
            document.addPage(newPage);
            PDPageContentStream cs = new PDPageContentStream(document, newPage);
            // Ensure the newly created content stream has a sensible default font set so callers
            // that immediately beginText()/showText() don't hit PDFBox's "Must call setFont() before showText()" error.
            // Use a standard built-in font (Helvetica) at a reasonable default size.
            try {
                // Use the PDType1Font constructor with a Standard14Fonts name (safe fallback)
                cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 12);
            } catch (Exception ignored) {
                // If setting the default font fails for any reason, ignore -- callers should set fonts explicitly.
            }
            float newY = newPage.getMediaBox().getHeight() - margin;
            return new PageState(newPage, cs, newY);
        }
        return new PageState(page, contentStream, yPosition);
    }
    
    @Transactional(readOnly = true)
    public Optional<byte[]> generateParticipantTicket(Long eventId, Long participantId) {
        log.info("Generating PDF ticket for participant {} in event {}", participantId, eventId);
        
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
            byte[] pdfBytes = createPdfTicket(event, participant, show, venue, organizer);
            return Optional.of(pdfBytes);
            
        } catch (Exception e) {
            log.error("Error generating participant ticket: {}", e.getMessage(), e);
            return Optional.empty();
        }
    }
    

    private float calculateTextHeight(String text, float width, PDFont font, int fontSize, float lineHeight) {
        if (text == null) return 0;
        String[] paragraphs = text.split("\\r?\\n");
        float totalHeight = 0;
        for (String paragraph : paragraphs) {
             if (paragraph.trim().isEmpty()) {
                 totalHeight += lineHeight;
                 continue;
             }
             String[] lines = wrapText(paragraph, width, font, fontSize);
             totalHeight += lines.length * lineHeight;
        }
        return totalHeight;
    }

    private byte[] createPdfTicket(EventEntity event, ParticipantEntity participant, ShowEntity show, VenueEntity venue, UserEntity organizer) throws IOException {
        try (PDDocument document = new PDDocument()) {
            PDPage page = new PDPage(PDRectangle.A4);
            document.addPage(page);
            
            PDPageContentStream contentStream = new PDPageContentStream(document, page);
            try {
                // Set up fonts
                PDFont headerFont;
                PDFont bodyFont;
                PDFont serifFont;
                PDFont serifBoldFont;
                
                try {
                    // Te pliki muszą być w src/main/resources/fonts/
                    bodyFont = PDType0Font.load(document, getClass().getResourceAsStream("/fonts/arimo-regular.ttf"));
                    headerFont = PDType0Font.load(document, getClass().getResourceAsStream("/fonts/arimo-bold.ttf"));
                    serifFont = PDType0Font.load(document, getClass().getResourceAsStream("/fonts/ptserif-regular.ttf"));
                    serifBoldFont = PDType0Font.load(document, getClass().getResourceAsStream("/fonts/ptserif-bold.ttf"));
                    
                    log.info("Załadowano czcionki Arimo i PT Serif z zasobów - raport będzie wyglądał wszędzie tak samo.");
                } catch (Exception e) {
                    log.error("Nie znaleziono czcionek w zasobach! Powrót do standardów.");
                    bodyFont = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
                    headerFont = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
                    serifFont = new PDType1Font(Standard14Fonts.FontName.TIMES_ROMAN);
                    serifBoldFont = new PDType1Font(Standard14Fonts.FontName.TIMES_BOLD);
                }

                float pageWidth = page.getMediaBox().getWidth();
                float pageHeight = page.getMediaBox().getHeight();
                float margin = 50;

                // --- Prepare Data ---
                String ticketDescription = event.getTicketDescription();
                if (ticketDescription == null || ticketDescription.trim().isEmpty()) {
                     java.time.format.DateTimeFormatter dateFormatter = java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy");
                     java.time.format.DateTimeFormatter timeFormatter = java.time.format.DateTimeFormatter.ofPattern("HH:mm");
                     String dateStr = event.getDateTime().format(dateFormatter);
                     String timeStr = event.getDateTime().format(timeFormatter);
                     
                     ticketDescription = "Poniżej przesyłamy informacje dotyczące przedstawienia pt. \"" + show.getName() + "\".\n" +
                                       "Data: " + dateStr + " godz. " + timeStr + "\n" +
                                       "Miejsce: " + venue.getName() + "\n" +
                                       "Adres: " + venue.getAddress()+ ", " + venue.getCity() + ", " + venue.getCountry() + "\n";
                }

                String[] footerNotes = {
                    "- na dole strony załączamy bilet wstępu",
                    "- szczegółowy wykaz rzędów oraz miejsc na widowni dla Państwa grupy znajduje się nad biletem",
                    "- prosimy o wydrukowanie biletu wraz z powyższymi informacjami i zabranie ze sobą na miejsce",                    
                };
                
                // Prepare data for seats section
                java.util.List<dev.knightcore.proeventiq.entity.ReservationEntity> reservations = reservationRepository.findByEventIdAndParticipantId(event.getEventId(), participant.getParticipantId());
                java.util.Map<Long, dev.knightcore.proeventiq.entity.SeatEntity> seatMap = new java.util.HashMap<>();
                for (var res : reservations) {
                    seatRepository.findById(res.getSeatId()).ifPresent(s -> seatMap.put(s.getSeatId(), s));
                }
                
                java.util.Map<String, java.util.Map<RowKey, java.util.List<Integer>>> grouped = new java.util.TreeMap<>();
                java.util.Set<String> sectorNames = new java.util.TreeSet<>();
                for (var seat : seatMap.values()) {
                    var row = seat.getSeatRow();
                    var sector = (row != null) ? row.getSector() : null;
                    String rawSectorName = (sector != null && sector.getName() != null) ? sector.getName() : "?";
                    sectorNames.add(rawSectorName);
                    String sectorName = "sektor " + rawSectorName;
                    
                    String rowNameStr = (row != null && row.getName() != null) ? row.getName() : 
                                     ((row != null && row.getOrderNumber() != null) ? String.valueOf(row.getOrderNumber()) : "?");
                    Integer rowOrder = (row != null) ? row.getOrderNumber() : null;
                    RowKey rowKey = new RowKey(rowNameStr, rowOrder);
                    
                    grouped.computeIfAbsent(sectorName, k -> new java.util.TreeMap<>());
                    grouped.get(sectorName).computeIfAbsent(rowKey, k -> new java.util.ArrayList<>()).add(seat.getOrderNumber());
                }

                // --- Calculate Font Size ---
                int currentFontSize = 11;
                float currentLineHeight = 15;
                float footerHeight = 215f;
    
                float safetyGap = 20;
                float contentWidth = pageWidth - 2 * margin;

                // Max available vertical space for content (excluding footer)
                float maxContentHeight = pageHeight - margin - footerHeight - safetyGap;

                // Try sizes 11 down to 6
                for (int size = 11; size >= 6; size--) {
                     float lh = (size == 11) ? 15 : (size * 1.4f); // heuristic
                     
                     float usedHeight = lh * 2; // "Szanowni Państwo" (using dynamic lineHeight spacing)
                     
                     usedHeight += calculateTextHeight(ticketDescription, contentWidth, serifFont, size, lh);
                     usedHeight += 8 + lh; // Spacing before footer notes
                     
                     for(String note : footerNotes) {
                         usedHeight += calculateTextHeight(note, contentWidth, serifFont, size, lh);
                     }
                     usedHeight += lh; // spacing
                     usedHeight += lh * 2; // "Dziękujemy"
                     
                     // Seats
                     float seatsH = calculateSeatsBlockHeight(grouped, bodyFont, lh, pageWidth - 40, size);
                     usedHeight += seatsH + lh; // + spacing
                     
                     if (usedHeight <= maxContentHeight) {
                         currentFontSize = size;
                         currentLineHeight = lh;
                         break;
                     }
                     
                     // If still doesn't fit at 6, we use 6 and let it span pages
                     if (size == 6) {
                         currentFontSize = 6;
                         currentLineHeight = 6 * 1.4f;
                     }
                }
                
                // --- Render with Calculated Font ---
                float yPosition = pageHeight - margin;
                float lineHeight = currentLineHeight;
                int fontSize = currentFontSize;

                // --- 1. Top Description Text ---
                
                contentStream.setFont(serifFont, 14); // Header
                // Center "Szanowni Państwo"
                float szanHeaderWidth = serifFont.getStringWidth("Szanowni Państwo") / 1000f * 14;
                float szanHeaderX = (pageWidth - szanHeaderWidth) / 2;
                contentStream.beginText();
                contentStream.newLineAtOffset(szanHeaderX, yPosition);
                safeShowText(contentStream, "Szanowni Państwo");
                contentStream.endText();
                yPosition -= lineHeight * 2; // Dynamic spacing

                // Content Font
                contentStream.setFont(serifFont, fontSize); // Use dynamic font size
                
                // Process ticket description line by line to preserve paragraphs
                String[] descParagraphs = ticketDescription.split("\\r?\\n");
                
                for (String paragraph : descParagraphs) {
                    if (paragraph.trim().isEmpty()) {
                         // Empty line
                         yPosition -= lineHeight;
                         continue;
                    }
                    
                    for (String line : wrapText(paragraph, pageWidth - 2 * margin, serifFont, fontSize)) {
                         contentStream.beginText();
                         contentStream.newLineAtOffset(margin, yPosition);
                         safeShowText(contentStream, line);
                         contentStream.endText();
                         yPosition -= lineHeight;
                    }
                }
                
                yPosition -= 8 + lineHeight;
                
                 for (String note : footerNotes) {
                     for(String line : wrapText(note, pageWidth - 2 * margin, serifFont, fontSize)) {
                        contentStream.beginText();
                        contentStream.newLineAtOffset(margin, yPosition);
                        safeShowText(contentStream, line);
                        contentStream.endText();
                        yPosition -= lineHeight;
                     }
                }
                
                yPosition -= lineHeight;
                
                // "Dziękujemy" - Center
                contentStream.setFont(serifFont, 14);
                float dziekWidth = serifFont.getStringWidth("Dziękujemy") / 1000f * 14;
                contentStream.beginText();
                contentStream.newLineAtOffset((pageWidth - dziekWidth)/2, yPosition);
                safeShowText(contentStream, "Dziękujemy");
                contentStream.endText();
                yPosition -= lineHeight * 2; // Fixed spacing        
                
                // Calculate required height for seats block
                float seatsBlockHeight = calculateSeatsBlockHeight(grouped, bodyFont, lineHeight, pageWidth - 40, fontSize); 
                float totalBlockHeight = seatsBlockHeight + lineHeight;
                
                float requiredSpace = totalBlockHeight + footerHeight + 10; // Total needed: content + footer + small gap
                
                // Check if everything fits on current page
                if (yPosition > requiredSpace) {
                    // It fits! Push content down to be close to footer (keep tiny safety gap)
                    float targetBottomY = footerHeight + 2;
                    yPosition = targetBottomY + totalBlockHeight;
                }
                // Otherwise render from current yPosition (natural flow)

                yPosition -= lineHeight;

                // --- 2. Seats Section ---
                PageState currentState = new PageState(page, contentStream, yPosition);
                // Call addSeatsSection (which now takes grouped map)
                currentState = addSeatsSection(document, currentState.page, currentState.contentStream, serifBoldFont, bodyFont, margin, currentState.yPosition, lineHeight, grouped, fontSize);
                
                page = currentState.page;
                contentStream = currentState.contentStream;
                yPosition = currentState.yPosition;

                // --- 3. Ticket Footer (Blue) ---
                // Check if space exists on current page for the footer (Ticket)
                // We want the ticket stick to the bottom. If yPosition is high enough, we can put it on this page.
                // But we must NOT draw over text.
                // Since this is a footer at y=0 to 215, we need yPosition > 215.
                
                 // Only move footer to a new page if it would overlap the content.
                 // We intentionally allow content to end very close to the footer.
                 if (yPosition < footerHeight + 2) {
                     // Add new page
                     if (contentStream != null) contentStream.close();
                     page = new PDPage(PDRectangle.A4);
                     document.addPage(page);
                     contentStream = new PDPageContentStream(document, page);
                     // Note: We need to re-set fonts if we were writing text, but drawTicketFooter handles its own fonts/rendering
                }
                
                drawTicketFooter(document, page, contentStream, event, participant, venue, organizer, show, sectorNames, serifFont, serifBoldFont, bodyFont);

            } finally {
                try { if (contentStream != null) contentStream.close(); } catch (Exception ignored) {}
            }
            
            // Convert to byte array
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            document.save(baos);
            return baos.toByteArray();
        }
    }

    private void drawTicketFooter(PDDocument document, PDPage page, PDPageContentStream contentStream, 
                                  EventEntity event, ParticipantEntity participant, VenueEntity venue, UserEntity organizer, ShowEntity show,
                                  java.util.Set<String> sectorNames,
                                  PDFont serifFont, PDFont serifBoldFont, PDFont bodyFont) throws IOException {
                float pageWidth = page.getMediaBox().getWidth();
                // Footer Height
                float footerHeight = 215f; 
                float footerY = 0; // Bottom of the page
                
                // Draw Blue Background
                // SkyBlue: (135, 206, 250)
                contentStream.setNonStrokingColor(135/255f, 206/255f, 250/255f);
                contentStream.addRect(0, 0, pageWidth, footerHeight);
                contentStream.fill();
                
                // --- Data Fields ---
                float startY = footerHeight - 32; 
                float lineHeight = 35;
                float valueBoxX = 140; 
                float valueBoxWidth = 200;
                float valueBoxHeight = 25;
                java.awt.Color labelColor = new java.awt.Color(0, 51, 102); // Navy Blue
                
                DateTimeFormatter customDateFormatter = DateTimeFormatter.ofPattern("dd/MM/yyyy 'r. godz.' HH:mm");
                
                drawField(contentStream, serifFont, bodyFont, "Data:", 
                    event.getDateTime() != null ? event.getDateTime().format(customDateFormatter) : "", 
                    startY, valueBoxX, valueBoxWidth, valueBoxHeight, labelColor);
                
                drawField(contentStream, serifFont, bodyFont, "Sektor:", 
                    String.join(" + ", sectorNames),
                    startY - lineHeight, valueBoxX, valueBoxWidth, valueBoxHeight, labelColor);
                
                String ticketCountStr = (participant.getChildrenTicketCount() != null ? participant.getChildrenTicketCount() : 0) + " dzieci + " + 
                                        (participant.getGuardianTicketCount() != null ? participant.getGuardianTicketCount() : 0) + " opiekunów";
                
                drawField(contentStream, serifFont, bodyFont, "Liczba biletów:", 
                    ticketCountStr,
                    startY - 2 * lineHeight, valueBoxX, valueBoxWidth, valueBoxHeight, labelColor);
                
                drawField(contentStream, serifFont, bodyFont, "Cena 1 biletu:", 
                    "", 
                    startY - 3 * lineHeight, valueBoxX, valueBoxWidth, valueBoxHeight, labelColor);
                

                // --- "BILET" Text ---
                float biletY = 25; 
                float biletX = valueBoxX + 10; 
                
                contentStream.setFont(serifBoldFont, 60);

                // Shadow
                contentStream.setRenderingMode(RenderingMode.FILL);
                contentStream.setNonStrokingColor(100/255f, 160/255f, 210/255f); 
                contentStream.beginText();
                float shadowOffset = 3f;
                contentStream.newLineAtOffset(biletX + shadowOffset, biletY - shadowOffset);
                safeShowText(contentStream, "BILET");
                contentStream.endText();
                
                // Set "BILET" style
                contentStream.setRenderingMode(RenderingMode.FILL_STROKE);
                contentStream.setNonStrokingColor(1f, 1f, 1f); 
                contentStream.setStrokingColor(60/255f, 120/255f, 180/255f); 
                contentStream.setLineWidth(1.0f);
                
                contentStream.beginText();
                contentStream.newLineAtOffset(biletX, biletY);
                safeShowText(contentStream, "BILET");
                contentStream.endText();
                
                contentStream.setRenderingMode(RenderingMode.FILL);
                contentStream.setNonStrokingColor(0f, 0f, 0f); // Reset to black
                
                // --- Logo (Bottom Left) ---
                if (organizer != null && organizer.getThumbnail() != null) {
                    try {
                        PDImageXObject logoImage = null;
                        try {
                            logoImage = PDImageXObject.createFromByteArray(document, organizer.getThumbnail(), "organizer_logo");
                        } catch (Exception inner) {
                             BufferedImage buffered = tryDecodeImage(organizer.getThumbnail());
                            if (buffered != null) {
                                logoImage = LosslessFactory.createFromImage(document, buffered);
                            }
                        }
                        
                        if (logoImage != null) {
                            float maxLogoSize = 60; 
                            float logoX = 50; // Centered under "Cena 1 biletu" label (approx center ~80)
                            float logoY = 15; // Aligned roughly with "BILET" baseline
                            
                            float scale = Math.min(maxLogoSize / logoImage.getWidth(), maxLogoSize / logoImage.getHeight());
                            float width = logoImage.getWidth() * scale;
                            float height = logoImage.getHeight() * scale;
                            
                            contentStream.drawImage(logoImage, logoX, logoY, width, height);
                        }
                    } catch (Exception e) {
                        log.warn("Could not load organizer logo: {}", e.getMessage());
                    }
                }

                // --- Show Logo (Bottom Right) ---
                if (show != null && show.getThumbnail() != null) {
                    try {
                        PDImageXObject showLogoImage = null;
                        try {
                            showLogoImage = PDImageXObject.createFromByteArray(document, show.getThumbnail(), "show_logo");
                        } catch (Exception inner) {
                             BufferedImage buffered = tryDecodeImage(show.getThumbnail());
                            if (buffered != null) {
                                showLogoImage = LosslessFactory.createFromImage(document, buffered);
                            }
                        }
                        
                        if (showLogoImage != null) {
                            float imageHeight = footerHeight;
                            float scale = imageHeight / showLogoImage.getHeight();
                            float imageWidth = showLogoImage.getWidth() * scale;
                            
                            // Calculate available width to avoid overlap with data fields
                            // data fields end at valueBoxX + valueBoxWidth = 340
                            // We give 20 padding from data fields, and 20 right margin
                            float maxWidth = pageWidth - (valueBoxX + valueBoxWidth + 20) - 20; 
                            
                            if (imageWidth > maxWidth) {
                                // Crop the image centered if it's too wide
                                contentStream.saveGraphicsState();
                                float clipX = pageWidth - 20 - maxWidth;
                                contentStream.addRect(clipX, 0, maxWidth, imageHeight);
                                contentStream.clip();
                                
                                // Center the image in the available space
                                float imageX = clipX + (maxWidth - imageWidth) / 2;
                                contentStream.drawImage(showLogoImage, imageX, 0, imageWidth, imageHeight);
                                contentStream.restoreGraphicsState();
                            } else {
                                float logoX = pageWidth - imageWidth - 20; 
                                float logoY = 0; 
                                contentStream.drawImage(showLogoImage, logoX, logoY, imageWidth, imageHeight);
                            }
                        }
                    } catch (Exception e) {
                        log.warn("Could not load show logo: {}", e.getMessage());
                    }
                }
    }

    private void drawField(PDPageContentStream contentStream, PDFont labelFont, PDFont valueFont, 
                           String label, String value, 
                           float y, float boxX, float boxWidth, float boxHeight,
                           java.awt.Color labelColor) throws IOException {
        // Label calculation
        float fontSize = 14;
        float textWidth = labelFont.getStringWidth(label) / 1000f * fontSize;
        float startTextX = (boxX - 10) - textWidth; // 10 units padding from box
        
        // Draw Label with custom color
        contentStream.setNonStrokingColor(labelColor.getRed()/255f, labelColor.getGreen()/255f, labelColor.getBlue()/255f);
        contentStream.setFont(labelFont, fontSize);
        contentStream.beginText();
        contentStream.newLineAtOffset(startTextX, y + (boxHeight - fontSize)/2 + 2); // Vertically center approx
        safeShowText(contentStream, label);
        contentStream.endText();
        
        // Draw White Box
        contentStream.setNonStrokingColor(1f, 1f, 1f); // White
        contentStream.addRect(boxX, y, boxWidth, boxHeight);
        contentStream.fill();
        
        // Draw Value inside Box
        if (value != null && !value.isEmpty()) {
            contentStream.setNonStrokingColor(0f, 0f, 0f); // Black text
            contentStream.setFont(valueFont, 12);
            contentStream.beginText();
            contentStream.newLineAtOffset(boxX + 5, y + 7); // Padding inside box
            safeShowText(contentStream, value);
            contentStream.endText();
        }
    }


    private PageState addSeatsSection(PDDocument document, PDPage page, PDPageContentStream contentStream, PDFont headerFont, PDFont bodyFont,
                                  float margin, float yPosition, float lineHeight,
                                  java.util.Map<String, java.util.Map<RowKey, java.util.List<Integer>>> grouped, int fontSize) throws IOException {
        LayoutResult result = layoutSeatsSection(document, page, contentStream, bodyFont, lineHeight, grouped, false, yPosition, fontSize);
        return result.pageState;
    }

    private float calculateSeatsBlockHeight(java.util.Map<String, java.util.Map<RowKey, java.util.List<Integer>>> grouped, PDFont bodyFont, float lineHeight, float tableWidth, int fontSize) {
        // Create dummy document/page for metric calculation context if needed, but mostly we just need font metrics.
        // We pass tableWidth via a hack or just assume layoutSeatsSection calculates width from page size.
        // layoutSeatsSection uses page.getMediaBox().
        // We can create a dummy PDPage with the correct width.
        PDPage dummyPage = new PDPage(new PDRectangle(tableWidth + 40, 842)); // 40 = 2*20 margins
        try {
            LayoutResult result = layoutSeatsSection(null, dummyPage, null, bodyFont, lineHeight, grouped, true, 800, fontSize);
            return result.totalHeight;
        } catch (IOException e) {
            return 0f;
        }
    }

    private static class SeatRenderLine {
        String text;
        boolean highlight;
        float height;
        public SeatRenderLine(String text, boolean highlight, float height) {
            this.text = text;
            this.highlight = highlight;
            this.height = height;
        }
    }

    private static class LayoutResult {
        float totalHeight;
        PageState pageState;
        public LayoutResult(float totalHeight, PageState pageState) {
            this.totalHeight = totalHeight;
            this.pageState = pageState;
        }
    }

    private LayoutResult layoutSeatsSection(PDDocument document, PDPage page, PDPageContentStream contentStream, 
                                          PDFont bodyFont, float lineHeight,
                                          java.util.Map<String, java.util.Map<RowKey, java.util.List<Integer>>> grouped,
                                          boolean dryRun, float startY, int fontSize) throws IOException {
        
        float currentY = startY;
        float sideMargin = 20;
        final float finalPageWidth = page.getMediaBox().getWidth();
        // float tableWidth = finalPageWidth - 2 * sideMargin;

        // Determine Columns (Fixed 4 columns width logic as requested)
        int maxCols = 4;
        float colGap = 5f;
        float availableWidth = finalPageWidth - (2 * sideMargin);
        float colWidth = (availableWidth - (maxCols - 1) * colGap) / maxCols;

        java.util.List<String> sectorKeys = new java.util.ArrayList<>(grouped.keySet());
        
        // Process in batches
        for (int batchStart = 0; batchStart < sectorKeys.size(); batchStart += maxCols) {
            int batchEnd = Math.min(batchStart + maxCols, sectorKeys.size());
            java.util.List<String> batchKeys = sectorKeys.subList(batchStart, batchEnd);

            // Prepare Lines
            java.util.List<java.util.List<SeatRenderLine>> batchColumns = new java.util.ArrayList<>();
            int maxLines = 0;

            for (String secKey : batchKeys) {
                java.util.List<SeatRenderLine> colLines = new java.util.ArrayList<>();
                
                // 1. Header (Sector Name)
                // Highlight box height = lineHeight approx (was fixed 14)
                colLines.add(new SeatRenderLine(secKey, true, lineHeight)); 
                
                // 2. Rows
                var rowsMap = grouped.get(secKey);
                for (var rowEntry : rowsMap.entrySet()) {
                    String rowName = rowEntry.getKey().name;
                    var seatNums = rowEntry.getValue();
                    seatNums.sort(Integer::compareTo);
                    String ranges = buildRanges(seatNums);
                    String lineText = "rząd " + rowName + " / miejsce " + ranges;
                    
                    String[] wrapped = wrapText(lineText, colWidth - 5, bodyFont, fontSize); // -5 padding
                    for (String w : wrapped) {
                        colLines.add(new SeatRenderLine(w, false, lineHeight));
                    }
                    // Small gap after row entry? calculated as per line
                }
                batchColumns.add(colLines);
                maxLines = Math.max(maxLines, colLines.size());
            }

            // Render/Measure Row by Row
            for (int i = 0; i < maxLines; i++) {
                float rowMaxHeight = 0;
                // Find height of this visual row
                for (var colLines : batchColumns) {
                    if (i < colLines.size()) {
                        rowMaxHeight = Math.max(rowMaxHeight, colLines.get(i).height);
                    }
                }
                // Add padding between lines? usually included in lineHeight.
                // But for Highlight header, we might want manual spacing?
                // Using max height covers it.

                if (!dryRun) {
                    // Check Page Space
                    if (currentY - rowMaxHeight < 50) { // Should leave space for footer if on last page? 
                        // But here we just respect generic bottom margin.
                        // However, we want the footer to fit.
                        // Assuming 50 margin is safely clear of footer zone or triggers break.
                        if (contentStream != null) contentStream.close();
                        PDPage newPage = new PDPage(PDRectangle.A4);
                        document.addPage(newPage);
                        page = newPage;
                        contentStream = new PDPageContentStream(document, page);
                        currentY = page.getMediaBox().getHeight() - 50;
                    }

                    // Draw
                    for (int c = 0; c < batchColumns.size(); c++) {
                        var colLines = batchColumns.get(c);
                        if (i < colLines.size()) {
                            SeatRenderLine item = colLines.get(i);
                            float drawX = sideMargin + c * (colWidth + colGap);
                            
                            if (item.highlight) {
                                // Draw Box (Full Column Width)
                                float textWidth = bodyFont.getStringWidth(item.text) / 1000f * fontSize;
                                float boxW = colWidth;
                                
                                contentStream.setNonStrokingColor(230/255f, 200/255f, 230/255f); 
                                contentStream.addRect(drawX, currentY - 3, boxW, item.height);
                                contentStream.fill();
                                contentStream.setNonStrokingColor(0,0,0);
                                
                                // Center Text
                                float centeredX = drawX + (colWidth - textWidth) / 2;
                                
                                contentStream.beginText();
                                contentStream.setFont(bodyFont, fontSize);
                                contentStream.newLineAtOffset(centeredX, currentY); 
                                safeShowText(contentStream, item.text);
                                contentStream.endText();
                            } else {
                                contentStream.beginText();
                                contentStream.setFont(bodyFont, fontSize);
                                contentStream.newLineAtOffset(drawX + 5, currentY); // Indent row info
                                safeShowText(contentStream, item.text);
                                contentStream.endText();
                            }
                        }
                    }
                }
                currentY -= rowMaxHeight;
            }
            // Gap between batches (only if not last batch)
            if (batchEnd < sectorKeys.size()) {
                currentY -= 5f; // Decreased gap logic
            }
        }

        return new LayoutResult(startY - currentY, new PageState(page, contentStream, currentY));
    }


    /**
     * Build a compact ranges string from sorted list of integers: [1,2,3,5,7,8] -> "1-3, 5, 7-8".
     */
    private String buildRanges(java.util.List<Integer> nums) {
        if (nums == null || nums.isEmpty()) return "";
        StringBuilder sb = new StringBuilder();
        Integer start = null;
        Integer prev = null;
        for (Integer n : nums) {
            if (start == null) {
                start = n;
                prev = n;
                continue;
            }
            if (n == prev + 1) {
                prev = n;
                continue;
            }
            // flush range
            appendRange(sb, start, prev);
            start = n;
            prev = n;
        }
        // flush last
        appendRange(sb, start, prev);
        return sb.toString();
    }

    private void appendRange(StringBuilder sb, Integer start, Integer end) {
        if (sb.length() > 0) sb.append(", ");
        if (start.equals(end)) sb.append(start);
        else sb.append(start).append("-").append(end);
    }
    
    @SuppressWarnings("java:S107") // More than 7 parameters
    private PageState addSection(PDDocument document, PDPage page, PDPageContentStream contentStream, PDFont headerFont, PDFont bodyFont,
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
        
        return new PageState(page, contentStream, yPosition - 10); // Extra spacing between sections
    }
    
    private PageState addShowSection(PDDocument document, PDPage page, PDPageContentStream contentStream, 
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
            log.info("Show thumbnail found: {} bytes, content type: {}", show.getThumbnail().length, show.getThumbnailContentType());
            try {
                PDImageXObject thumbnail;
                try {
                    thumbnail = PDImageXObject.createFromByteArray(document, show.getThumbnail(), "thumbnail");
                    log.info("Successfully created PDImageXObject from thumbnail bytes");
                } catch (Exception inner) {
                    log.warn("PDImageXObject.createFromByteArray failed: {}, attempting ImageIO fallback", inner.getMessage());
                    // Fallback to ImageIO + LosslessFactory for formats not supported directly
                            BufferedImage buffered = tryDecodeImage(show.getThumbnail());
                            if (buffered != null) {
                                log.info("Successfully decoded image via ImageIO/SVG fallback: {}x{}", buffered.getWidth(), buffered.getHeight());
                                thumbnail = LosslessFactory.createFromImage(document, buffered);
                            } else {
                                throw new IOException("Could not decode show thumbnail (ImageIO + SVG fallback failed)");
                            }
                }

                contentStream.drawImage(thumbnail, thumbnailX, yPosition - thumbnailSize, thumbnailSize, thumbnailSize);
                log.info("Successfully drew thumbnail image in PDF");
            } catch (Exception e) {
                log.error("Could not load show thumbnail, using placeholder. Error: {}", e.getMessage(), e);
                drawThumbnailPlaceholder(contentStream, thumbnailX, yPosition - thumbnailSize, thumbnailSize);
            }
        } else {
            log.warn("Show thumbnail is null or empty, using placeholder");
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
        return new PageState(page, contentStream, sectionEndY - 20); // Extra spacing between sections
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

    /**
     * Try to decode arbitrary image bytes to a BufferedImage. This attempts ImageIO first,
     * and if that fails, attempts to rasterize SVG bytes using Batik's PNGTranscoder.
     */
    private BufferedImage tryDecodeImage(byte[] data) {
        if (data == null || data.length == 0) return null;

        // Try ImageIO first (handles PNG, JPEG, GIF, etc.)
        try (ByteArrayInputStream bais = new ByteArrayInputStream(data)) {
            BufferedImage img = ImageIO.read(bais);
            if (img != null) return img;
        } catch (IOException ignored) {}

        // If ImageIO could not decode, try to treat as SVG and rasterize via Batik
        try {
            return rasterizeSvgToPngBufferedImage(data);
        } catch (Exception e) {
            log.debug("SVG rasterization failed: {}", e.getMessage());
            return null;
        }
    }

    private BufferedImage rasterizeSvgToPngBufferedImage(byte[] svgBytes) throws TranscoderException, IOException {
        if (svgBytes == null || svgBytes.length == 0) return null;
        PNGTranscoder transcoder = new PNGTranscoder();
        try (ByteArrayInputStream bais = new ByteArrayInputStream(svgBytes);
             java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream()) {
            TranscoderInput input = new TranscoderInput(bais);
            TranscoderOutput output = new TranscoderOutput(baos);
            transcoder.transcode(input, output);
            baos.flush();
            byte[] pngBytes = baos.toByteArray();
            try (ByteArrayInputStream pngIn = new ByteArrayInputStream(pngBytes)) {
                return ImageIO.read(pngIn);
            }
        }
    }
    
    private String[] wrapText(String text, float maxWidth, PDFont font, int fontSize) {
        if (text == null || text.isEmpty()) {
            return new String[]{"No description available"};
        }
        
        // Pre-process text to handle tabs and non-breaking spaces consistently
        // Replace tabs with 4 spaces to preserve indentation intent
        text = text.replace("\t", "    ");
        // Replace NBSP with normal space so splitting works consistently
        text = text.replace('\u00A0', ' ');
        
        // For width calculation, we need to use sanitized text
        // But we want to return the original text split properly
        // sanitizeText might replace characters but shouldn't add/remove spaces if we handled NBSP already
        String sanitizedForCalculation = replacePolishCharacters(sanitizeText(text));
        
        try {
            // Split by single space to preserve multiple spaces/indentation
            // -1 limit ensures trailing empty strings are included if necessary (though usually strict split is enough)
            String[] originalWords = text.split(" ", -1);
            String[] sanitizedWords = sanitizedForCalculation.split(" ", -1);
            
            // Make sure both arrays have the same length
            if (originalWords.length != sanitizedWords.length) {
                log.warn("Word count mismatch after sanitization (orig={}, san={}), using fallback", 
                        originalWords.length, sanitizedWords.length);
                return splitTextIntoChunks(text, 80);
            }
            
            java.util.List<String> lines = new java.util.ArrayList<>();
            
            java.util.List<String> currentOriginalWords = new java.util.ArrayList<>();
            java.util.List<String> currentSanitizedWords = new java.util.ArrayList<>();
            
            for (int i = 0; i < originalWords.length; i++) {
                String originalWord = originalWords[i];
                String sanitizedWord = sanitizedWords[i];
                
                // Construct a test string to check width
                String testSanitizedLine;
                if (currentSanitizedWords.isEmpty()) {
                    testSanitizedLine = sanitizedWord;
                } else {
                    testSanitizedLine = String.join(" ", currentSanitizedWords) + " " + sanitizedWord;
                }
                
                float textWidth = font.getStringWidth(testSanitizedLine) / 1000 * fontSize;
                
                if (textWidth <= maxWidth) {
                    currentOriginalWords.add(originalWord);
                    currentSanitizedWords.add(sanitizedWord);
                } else {
                    if (!currentOriginalWords.isEmpty()) {
                        lines.add(String.join(" ", currentOriginalWords));
                        currentOriginalWords.clear();
                        currentSanitizedWords.clear();
                        currentOriginalWords.add(originalWord);
                        currentSanitizedWords.add(sanitizedWord);
                    } else {
                        // Single word is too long, add it anyway to avoid infinite loop or dropping content
                        lines.add(originalWord);
                        // Start fresh next loop (though logic effectively handled by adding and continuing, 
                        // but here we already added to lines, so clear)
                        currentOriginalWords.clear();
                        currentSanitizedWords.clear();
                    }
                }
            }
            
            if (!currentOriginalWords.isEmpty()) {
                lines.add(String.join(" ", currentOriginalWords));
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
            try {
                contentStream.showText("");
                return;
            } catch (IllegalStateException | IllegalArgumentException ise) {
                // fall through to font-fixing logic below
            }
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
        } catch (IllegalStateException ise) {
            // This indicates setFont() was not called on the content stream. Try to recover by
            // setting a safe fallback font and retrying the same sanitization sequence.
            log.warn("Content stream missing font when showing text, attempting to set fallback font and retry: {}", ise.getMessage());
            try {
                contentStream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 12);
            } catch (Exception ignore) {}

            try {
                contentStream.showText(text);
                return;
            } catch (IllegalArgumentException e) {
                try {
                    String basicSanitized = sanitizeText(text);
                    contentStream.showText(basicSanitized);
                    return;
                } catch (IllegalArgumentException e2) {
                    String polishReplaced = replacePolishCharacters(sanitizeText(text));
                    try {
                        contentStream.showText(polishReplaced);
                        return;
                    } catch (IllegalArgumentException e3) {
                        String aggressivelySanitized = polishReplaced.replaceAll("[^\\x00-\\x7F]", "?");
                        contentStream.showText(aggressivelySanitized);
                        return;
                    }
                }
            } catch (IllegalStateException e4) {
                // If it still fails, rethrow so caller can handle/log
                throw e4;
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
    public Optional<byte[]> generateAllParticipantTicketsZip(Long eventId) {
        log.info("Generating ZIP file with all participant tickets for event {}", eventId);
        
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
                        // Generate individual participant ticket
                        Optional<byte[]> ticketBytes = generateParticipantTicket(eventId, participant.getParticipantId());
                        
                        if (ticketBytes.isPresent()) {
                            // Create ZIP entry for this participant ticket using centralized filename logic
                            String fileName = generateParticipantTicketFilename(eventId, participant.getParticipantId());
                            ZipEntry zipEntry = new ZipEntry(fileName);
                            zipStream.putNextEntry(zipEntry);
                            zipStream.write(ticketBytes.get());
                            zipStream.closeEntry();
                            
                            log.debug("Added ticket for participant {} to ZIP", participant.getParticipantId());
                        } else {
                            log.warn("Failed to generate ticket for participant {}", participant.getParticipantId());
                        }
                    } catch (Exception e) {
                        log.error("Error generating ticket for participant {}: {}", participant.getParticipantId(), e.getMessage());
                        // Continue with other participants even if one fails
                    }
                }
            }
            
            byte[] zipBytes = zipOutput.toByteArray();
            log.info("Successfully generated ZIP file with {} participants for event {}", participants.size(), eventId);
            return Optional.of(zipBytes);
            
        } catch (Exception e) {
            log.error("Error generating ZIP file of participant tickets for event {}: {}", eventId, e.getMessage(), e);
            return Optional.empty();
        }
    }

    /**
     * Generates a standardized filename for a single participant ticket
     * @param eventId the event ID
     * @param participantId the participant ID
     * @return formatted filename for the participant ticket
     */
    public String generateParticipantTicketFilename(Long eventId, Long participantId) {
        try {
            // Fetch all required data for filename generation
            Optional<EventEntity> eventOpt = eventRepository.findById(eventId);
            Optional<ParticipantEntity> participantOpt = participantRepository.findByParticipantIdAndEventId(participantId, eventId);
            
            if (eventOpt.isEmpty() || participantOpt.isEmpty()) {
                log.warn("Event or participant not found for filename generation - eventId: {}, participantId: {}", eventId, participantId);
                return String.format("participant_ticket_%s_event_%d.pdf", participantId, eventId);
            }
            
            EventEntity event = eventOpt.get();
            ParticipantEntity participant = participantOpt.get();
            
            Optional<ShowEntity> showOpt = showRepository.findById(event.getShowId());
            if (showOpt.isEmpty()) {
                log.warn("Show not found for filename generation - eventId: {}", eventId);
                return String.format("participant_ticket_%s_event_%d.pdf", participantId, eventId);
            }
            
            ShowEntity show = showOpt.get();
            
            // Generate filename: participant_name_date_show_name.pdf
            String participantName = sanitizeFilename(participant.getName() != null ? participant.getName() : "unknown");
            String showName = sanitizeFilename(show.getName() != null ? show.getName() : "unknown_show");
            String date = event.getDateTime() != null ? 
                event.getDateTime().format(DateTimeFormatter.ofPattern("yyyy_MM_dd")) : "unknown_date";
            
            return String.format("%s_%s_%s.pdf", participantName, date, showName);
            
        } catch (Exception e) {
            log.error("Error generating filename for participant ticket: {}", e.getMessage());
            // Fallback to simple format
            return String.format("participant_ticket_%s_event_%d.pdf", participantId, eventId);
        }
    }

    /**
     * Generates a standardized filename for the ZIP file containing all participant tickets
     * @param eventId the event ID
     * @return formatted filename for the ZIP file
     */
    public String generateParticipantTicketsZipFilename(Long eventId) {
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

    private static class Point {
        final double x, y;
        Point(double x, double y) { this.x = x; this.y = y; }
    }

    private List<Point> getConvexHull(List<Point> points) {
        if (points.size() <= 2) return points;
        List<Point> sortedPoints = new java.util.ArrayList<>(points);
        sortedPoints.sort((a, b) -> a.x != b.x ? Double.compare(a.x, b.x) : Double.compare(a.y, b.y));
        List<Point> upper = new java.util.ArrayList<>();
        List<Point> lower = new java.util.ArrayList<>();
        for (Point p : sortedPoints) {
            while (upper.size() >= 2 && cross(upper.get(upper.size() - 2), upper.get(upper.size() - 1), p) <= 0) {
                upper.remove(upper.size() - 1);
            }
            upper.add(p);
        }
        for (int i = sortedPoints.size() - 1; i >= 0; i--) {
            Point p = sortedPoints.get(i);
            while (lower.size() >= 2 && cross(lower.get(lower.size() - 2), lower.get(lower.size() - 1), p) <= 0) {
                lower.remove(lower.size() - 1);
            }
            lower.add(p);
        }
        upper.remove(upper.size() - 1);
        lower.remove(lower.size() - 1);
        List<Point> hull = new java.util.ArrayList<>(upper);
        hull.addAll(lower);
        return hull;
    }

    private double cross(Point o, Point a, Point b) {
        return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
    }

    @Transactional(readOnly = true)
    public Optional<byte[]> generateParticipantMap(Long eventId, Long participantId) {
        log.info("Generating PDF map for participant {} in event {}", participantId, eventId);
        
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
                }
            }

            // Fetch all reservations for this participant in this event
            List<ReservationEntity> reservations = reservationRepository.findByEventIdAndParticipantId(eventId, participantId);
            java.util.Set<Long> participantSeatIds = reservations.stream()
                .map(ReservationEntity::getSeatId)
                .collect(java.util.stream.Collectors.toSet());

            // Generate PDF
            byte[] pdfBytes = createPdfMap(event, participant, show, venue, participantSeatIds, organizer);
            return Optional.of(pdfBytes);
            
        } catch (Exception e) {
            log.error("Error generating participant map: {}", e.getMessage(), e);
            return Optional.empty();
        }
    }

    private byte[] createPdfMap(EventEntity event, ParticipantEntity participant, ShowEntity show, VenueEntity venue, java.util.Set<Long> participantSeatIds, UserEntity organizer) throws IOException {
        try (PDDocument document = new PDDocument()) {
            // Determine orientation based on venue layout
            double venueWidth = venue.getWidth() != null ? venue.getWidth() : 3000.0;
            double venueHeight = venue.getHeight() != null ? venue.getHeight() : 1500.0;
            boolean isLandscape = venueWidth > venueHeight;
            
            PDRectangle pageSize = isLandscape ? 
                new PDRectangle(PDRectangle.A4.getHeight(), PDRectangle.A4.getWidth()) : 
                PDRectangle.A4;
            
            PDPage page = new PDPage(pageSize);
            document.addPage(page);
            
            Set<SectorEntity> participantSectors = new java.util.LinkedHashSet<>();
            PDPageContentStream contentStream = new PDPageContentStream(document, page);
            try {
                // Set up fonts
                PDFont headerFont = PDType0Font.load(document, getClass().getResourceAsStream("/fonts/arimo-bold.ttf"));
                PDFont bodyFont = PDType0Font.load(document, getClass().getResourceAsStream("/fonts/arimo-regular.ttf"));
                PDFont serifFont = PDType0Font.load(document, getClass().getResourceAsStream("/fonts/ptserif-regular.ttf"));

                float margin = 50;
                float pageWidth = page.getMediaBox().getWidth();
                float pageHeight = page.getMediaBox().getHeight();
                float yPosition = pageHeight - margin;

                // --- Logo (Top Right) ---
                if (organizer != null && organizer.getThumbnail() != null) {
                    try {
                        PDImageXObject logoImage = PDImageXObject.createFromByteArray(document, organizer.getThumbnail(), "organizer_logo");
                        
                        if (logoImage != null) {
                            float maxLogoSize = 60; 
                            float logoScale = Math.min(maxLogoSize / logoImage.getWidth(), maxLogoSize / logoImage.getHeight());
                            float lWidth = logoImage.getWidth() * logoScale;
                            float lHeight = logoImage.getHeight() * logoScale;
                            float logoX = pageWidth - margin - lWidth;
                            float logoY = yPosition - lHeight + 18; // Moved slightly higher to align with text top
                            
                            contentStream.drawImage(logoImage, logoX, logoY, lWidth, lHeight);
                        }
                    } catch (Exception e) {
                        log.warn("Could not load organizer logo for map: {}", e.getMessage());
                    }
                }

                // Title and Event Information (Top Left) in Polish
                contentStream.setFont(headerFont, 16);
                contentStream.beginText();
                contentStream.newLineAtOffset(margin, yPosition);
                safeShowText(contentStream, (show.getName() != null ? show.getName() : "N/A"));
                contentStream.endText();
                yPosition -= 18;

                // Use serif font for details like in ticket description
                contentStream.setFont(serifFont, 11);
                
                // Venue name and address
                contentStream.beginText();
                contentStream.newLineAtOffset(margin, yPosition);
                String venueInfo = (venue.getName() != null ? venue.getName() : "N/A");
                String address = formatAddress(venue);
                if (!"N/A".equals(address)) {
                    venueInfo += "; " + address;
                }
                safeShowText(contentStream, venueInfo);
                contentStream.endText();
                yPosition -= 14;

                // Event date and time formatted in Polish style
                contentStream.beginText();
                contentStream.newLineAtOffset(margin, yPosition);
                String dateStr = event.getDateTime() != null ? 
                    event.getDateTime().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy 'r. godz.' HH:mm")) : "N/A";
                safeShowText(contentStream, dateStr);
                contentStream.endText();
                yPosition -= 14;

                // Participant name (no label)
                contentStream.beginText();
                contentStream.newLineAtOffset(margin, yPosition);
                safeShowText(contentStream, (participant.getName() != null ? participant.getName() : "N/A"));
                contentStream.endText();
                yPosition -= 30;

                // Map area calculation
                float mapMaxWidth = pageWidth - 2 * margin;
                float mapMaxHeight = yPosition - margin;
                
                // Scaling to fit A4
                float scale = Math.min(mapMaxWidth / (float)venueWidth, mapMaxHeight / (float)venueHeight);
                float offsetX = (mapMaxWidth - (float)venueWidth * scale) / 2;
                float offsetY = (mapMaxHeight - (float)venueHeight * scale) / 2;

                // Final origin for drawing (bottom-left of map area)
                float drawX = margin + offsetX;
                float drawY = margin + offsetY;

                // Fetch sectors for map
                List<SectorEntity> sectors = venue.getSectors();
                if (sectors != null) {
                    for (SectorEntity sector : sectors) {
                        boolean sectorHasParticipantSeats = false;
                        if (sector.getSeatRows() != null) {
                            for (SeatRowEntity row : sector.getSeatRows()) {
                                if (row.getSeats() != null) {
                                    for (SeatEntity seat : row.getSeats()) {
                                        if (participantSeatIds.contains(seat.getSeatId())) {
                                            sectorHasParticipantSeats = true;
                                            break;
                                        }
                                    }
                                }
                                if (sectorHasParticipantSeats) break;
                            }
                        }
                        
                        drawSector(contentStream, sector, scale, drawX, drawY, (float)venueHeight, participantSeatIds, bodyFont);
                        
                        if (sectorHasParticipantSeats) {
                            participantSectors.add(sector);
                        }
                    }
                }

            } finally {
                contentStream.close();
            }

            // Add detail pages for each sector the participant has seats in
            PDFont sectorTitleFont = PDType0Font.load(document, getClass().getResourceAsStream("/fonts/ptserif-regular.ttf"));
            PDFont sectorRowFont = PDType0Font.load(document, getClass().getResourceAsStream("/fonts/arimo-bold.ttf"));
            PDFont sectorSeatFont = PDType0Font.load(document, getClass().getResourceAsStream("/fonts/arimo-regular.ttf"));
            
            for (SectorEntity sector : participantSectors) {
                addSectorDetailPage(document, sector, participantSeatIds, sectorTitleFont, sectorRowFont, sectorSeatFont, organizer);
            }
            
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            document.save(baos);
            return baos.toByteArray();
        }
    }

    private void drawSector(PDPageContentStream contentStream, SectorEntity sector, float scale, float drawX, float drawY, float venueHeight, java.util.Set<Long> participantSeatIds, PDFont font) throws IOException {
        boolean hasParticipantSeats = false;
        List<Point> points = new java.util.ArrayList<>();
        
        List<SeatRowEntity> rows = sector.getSeatRows();
        if (rows != null) {
            for (SeatRowEntity row : rows) {
                List<SeatEntity> seats = row.getSeats();
                if (seats != null) {
                    for (SeatEntity seat : seats) {
                        if (participantSeatIds.contains(seat.getSeatId())) {
                            hasParticipantSeats = true;
                        }
                        if (seat.getPositionX() != null && seat.getPositionY() != null) {
                            points.add(new Point(seat.getPositionX() * 0.4, seat.getPositionY() * 0.4));
                        }
                    }
                }
            }
        }
        
        if (points.isEmpty()) return;

        // Flip Y logic to match frontend (venue-map-edit.component.ts)
        long negativeYCount = points.stream().filter(p -> p.y < 0).count();
        long positiveYCount = points.stream().filter(p -> p.y > 0).count();
        if (negativeYCount > positiveYCount) {
             double maxY = points.stream().mapToDouble(p -> p.y).max().orElse(0);
             List<Point> flippedPoints = new java.util.ArrayList<>();
             for (Point p : points) {
                 flippedPoints.add(new Point(p.x, maxY - p.y));
             }
             points = flippedPoints;
        }

        List<Point> hull = getConvexHull(points);
        if (hull.size() < 2) {
            double minX = points.stream().mapToDouble(p -> p.x).min().orElse(0);
            double maxX = points.stream().mapToDouble(p -> p.x).max().orElse(0);
            double minY = points.stream().mapToDouble(p -> p.y).min().orElse(0);
            double maxY = points.stream().mapToDouble(p -> p.y).max().orElse(0);
            double padding = 8.0; // Padded for small sectors
            hull = java.util.Arrays.asList(
                new Point(minX - padding, minY - padding),
                new Point(maxX + padding, minY - padding),
                new Point(maxX + padding, maxY + padding),
                new Point(minX - padding, maxY + padding)
            );
        }

        double sectorX = sector.getPositionX() != null ? sector.getPositionX() : 0;
        double sectorY = sector.getPositionY() != null ? sector.getPositionY() : 0;
        double rotationRad = Math.toRadians(sector.getRotation() != null ? sector.getRotation() : 0);

        List<Point> transformedHull = new java.util.ArrayList<>();
        for (Point p : hull) {
            double rx = p.x * Math.cos(rotationRad) - p.y * Math.sin(rotationRad);
            double ry = p.x * Math.sin(rotationRad) + p.y * Math.cos(rotationRad);
            double tx = rx + sectorX;
            double ty = ry + sectorY;
            
            float pPdfX = drawX + (float)tx * scale;
            float pPdfY = drawY + (venueHeight - (float)ty) * scale;
            transformedHull.add(new Point(pPdfX, pPdfY));
        }

        if (hasParticipantSeats) {
            // Blue for participant sectors
            contentStream.setNonStrokingColor(new java.awt.Color(33, 150, 243));
            contentStream.setStrokingColor(new java.awt.Color(25, 118, 210)); // Darker blue border
            contentStream.setLineWidth(2.0f);
        } else {
            // Light grey for others, but with darker borders
            contentStream.setNonStrokingColor(new java.awt.Color(245, 245, 245));
            contentStream.setStrokingColor(java.awt.Color.DARK_GRAY); // Darker border
            contentStream.setLineWidth(1.5f);
        }

        contentStream.moveTo((float)transformedHull.get(0).x, (float)transformedHull.get(0).y);
        for (int i = 1; i < transformedHull.size(); i++) {
            contentStream.lineTo((float)transformedHull.get(i).x, (float)transformedHull.get(i).y);
        }
        contentStream.closePath();
        contentStream.fillAndStroke();

        // Calculate Centroid of the original (scaled 0.4) shape to match frontend anchor
        double centroidX, centroidY;
        if (hull.size() > 2) {
             double area = 0, cx = 0, cy = 0;
             for (int i = 0; i < hull.size(); i++) {
                 Point p0 = hull.get(i);
                 Point p1 = hull.get((i + 1) % hull.size());
                 double cross = p0.x * p1.y - p1.x * p0.y;
                 area += cross;
                 cx += (p0.x + p1.x) * cross;
                 cy += (p0.y + p1.y) * cross;
             }
             area = area / 2.0;
             if (Math.abs(area) > 1e-7) {
                 centroidX = cx / (6 * area);
                 centroidY = cy / (6 * area);
             } else {
                 centroidX = hull.stream().mapToDouble(p -> p.x).average().orElse(0);
                 centroidY = hull.stream().mapToDouble(p -> p.y).average().orElse(0);
             }
        } else {
             centroidX = points.stream().mapToDouble(p -> p.x).average().orElse(0);
             centroidY = points.stream().mapToDouble(p -> p.y).average().orElse(0);
        }

        // Label Logic
        float finalFontSize;
        float textRotation = 0;

        // Apply offsets from DB (additive to centroid, already in scaled units)
        double labelOffsetX = (sector.getLabelPositionX() != null) ? sector.getLabelPositionX() : 0;
        double labelOffsetY = (sector.getLabelPositionY() != null) ? sector.getLabelPositionY() : 0;
        
        double lLocalX = centroidX + labelOffsetX;
        double lLocalY = centroidY + labelOffsetY;
        
        // Apply Sector Rotation
        double rx = lLocalX * Math.cos(rotationRad) - lLocalY * Math.sin(rotationRad);
        double ry = lLocalX * Math.sin(rotationRad) + lLocalY * Math.cos(rotationRad);
        
        // Translate to Venue Space
        double tx = rx + sectorX;
        double ty = ry + sectorY;
        
        // Scale to PDF
        float labelGlobalX = drawX + (float)tx * scale;
        float labelGlobalY = drawY + (venueHeight - (float)ty) * scale;
        
        if (sector.getLabelFontSize() != null) {
            // Heuristic multiplier - reduced further to be smaller
            finalFontSize = sector.getLabelFontSize() * scale; 
        } else {
            finalFontSize = Math.max(6, 12 * scale);
        }
             
        if (sector.getLabelRotation() != null) {
            // Combined rotation: Sector + Label
            double labelRot = sector.getLabelRotation();
            double sectorRot = (sector.getRotation() != null) ? sector.getRotation() : 0;
            // Negate for PDF coordinate system
            textRotation = (float)Math.toRadians(-(sectorRot + labelRot)); 
        } else {
            // Just sector rotation? Frontend rotates labelGroup by labelRot (def 0)
            // inside SectorGroup (rotated by sectorRot).
            double sectorRot = (sector.getRotation() != null) ? sector.getRotation() : 0;
            textRotation = (float)Math.toRadians(-sectorRot);
        }

        contentStream.beginText();
        contentStream.setFont(font, finalFontSize);
        contentStream.setNonStrokingColor(java.awt.Color.BLACK);
        String name = sector.getName() != null ? sector.getName() : "Sektor";
        
        name = name.replaceAll("[\\n\\r]", " ");
        float textWidth = font.getStringWidth(name) / 1000 * finalFontSize;
        
        org.apache.pdfbox.util.Matrix matrix = org.apache.pdfbox.util.Matrix.getTranslateInstance(labelGlobalX, labelGlobalY);
        if (textRotation != 0) {
            matrix.rotate(textRotation);
        }
        
        // Offset for alignment and frontend y=-20 shift
        // "Up" 20 pixels in screen coords -> +20 * scale in PDF coords (rotated frame)
        // Baseline adjustment: assuming top of text is at +20*scale.
        float yShift = 20 * scale - finalFontSize; 
        
        // Center text horizontally
        matrix.translate(-textWidth / 2, yShift);
        
        contentStream.setTextMatrix(matrix);
        contentStream.showText(name);
        contentStream.endText();
    }

    private void addSectorDetailPage(PDDocument document, SectorEntity sector, Set<Long> participantSeatIds, PDFont titleFont, PDFont rowFont, PDFont seatFont, UserEntity organizer) throws IOException {
        
        // --- 1. PRE-CALCULATE DIMENSIONS TO DECIDE ORIENTATION ---
        double rotationRad = Math.toRadians(sector.getRotation() != null ? sector.getRotation() : 0);
        List<SeatEntity> allSeats = new ArrayList<>();
        if (sector.getSeatRows() != null) {
            for (SeatRowEntity row : sector.getSeatRows()) {
                if (row.getSeats() != null) {
                    allSeats.addAll(row.getSeats());
                }
            }
        }
        
        if (allSeats.isEmpty()) return;

        // Calculate transformed coordinates (rotated just like in the map)
        List<Point> transformedPoints = new ArrayList<>();
        List<Point> seatCenters = new ArrayList<>(); 
        double borderPadding = 8.0; // Reduced padding

        for (SeatEntity seat : allSeats) {
            if (seat.getPositionX() == null || seat.getPositionY() == null) continue;
            double sx = seat.getPositionX() * 0.4;
            double sy = seat.getPositionY() * 0.4;
            
            // Rotation
            double rx = sx * Math.cos(rotationRad) - sy * Math.sin(rotationRad);
            double ry = sx * Math.sin(rotationRad) + sy * Math.cos(rotationRad);
            
            Point center = new Point(rx, ry);
            seatCenters.add(center);
            transformedPoints.add(center);
            // Add points around the seat to push the hull out (padding)
            transformedPoints.add(new Point(rx - borderPadding, ry - borderPadding));
            transformedPoints.add(new Point(rx + borderPadding, ry - borderPadding));
            transformedPoints.add(new Point(rx + borderPadding, ry + borderPadding));
            transformedPoints.add(new Point(rx - borderPadding, ry + borderPadding));
        }

        // Model coordinates bounding box after rotation
        double minX = transformedPoints.stream().mapToDouble(p -> p.x).min().orElse(0);
        double maxX = transformedPoints.stream().mapToDouble(p -> p.x).max().orElse(0);
        double minY = transformedPoints.stream().mapToDouble(p -> p.y).min().orElse(0);
        double maxY = transformedPoints.stream().mapToDouble(p -> p.y).max().orElse(0);

        double hullPadding = 10.0; // Reduced hull padding
        double contentWidth = maxX - minX + 2 * hullPadding;
        double contentHeight = maxY - minY + 2 * hullPadding;

        // Decide orientation: if wide, use Landscape
        boolean landscape = contentWidth > contentHeight * 1.2; // slight bias towards portrait unless clearly wide
        
        PDPage page = landscape 
            ? new PDPage(new PDRectangle(PDRectangle.A4.getHeight(), PDRectangle.A4.getWidth())) 
            : new PDPage(PDRectangle.A4);
        document.addPage(page);
        
        try (PDPageContentStream contentStream = new PDPageContentStream(document, page)) {
            // Reduced margin to use more page space (User Request: large margins issue)
            float margin = 30;
            float pageWidth = page.getMediaBox().getWidth();
            float pageHeight = page.getMediaBox().getHeight();
            float yPosition = pageHeight - margin;

            // --- Logo (Top Right) ---
            if (organizer != null && organizer.getThumbnail() != null) {
                try {
                    PDImageXObject logoImage = PDImageXObject.createFromByteArray(document, organizer.getThumbnail(), "organizer_logo_sector_" + sector.getSectorId());
                    if (logoImage != null) {
                        float maxLogoSize = 60; 
                        float logoScale = Math.min(maxLogoSize / logoImage.getWidth(), maxLogoSize / logoImage.getHeight());
                        float lWidth = logoImage.getWidth() * logoScale;
                        float lHeight = logoImage.getHeight() * logoScale;
                        float logoX = pageWidth - margin - lWidth;
                        float logoY = yPosition - lHeight + 18; 
                        contentStream.drawImage(logoImage, logoX, logoY, lWidth, lHeight);
                    }
                } catch (Exception e) {
                    log.warn("Could not load organizer logo for sector page: {}", e.getMessage());
                }
            }

            // Title (Sector Name) formatted like event name on first page
            contentStream.setFont(rowFont, 16); // Arimo Bold
            contentStream.beginText();
            contentStream.newLineAtOffset(margin, yPosition);
            safeShowText(contentStream, "Sektor: " + (sector.getName() != null ? sector.getName() : "N/A"));
            contentStream.endText();
            yPosition -= 18;

            // Liczba biletów calculation and display
            long ticketCountInSector = 0;
            if (sector.getSeatRows() != null) {
                for (SeatRowEntity row : sector.getSeatRows()) {
                    if (row.getSeats() != null) {
                        ticketCountInSector += row.getSeats().stream()
                            .filter(s -> participantSeatIds.contains(s.getSeatId()))
                            .count();
                    }
                }
            }

            contentStream.setFont(titleFont, 11); // PT Serif Regular
            contentStream.beginText();
            contentStream.newLineAtOffset(margin, yPosition);
            safeShowText(contentStream, "Liczba biletów: " + ticketCountInSector);
            contentStream.endText();
            yPosition -= 30;

            float mapMaxWidth = pageWidth - 2 * margin;
            float mapMaxHeight = yPosition - margin;
            
            float scale = Math.min(mapMaxWidth / (float)contentWidth, mapMaxHeight / (float)contentHeight);
            
            float offsetX = (mapMaxWidth - (float)contentWidth * scale) / 2;
            float offsetY = (mapMaxHeight - (float)contentHeight * scale) / 2;

            float drawX = margin + offsetX;
            float drawY = margin + offsetY;

            // Draw Hull
            List<Point> hull = getConvexHull(transformedPoints);
            if (hull.size() < 2) {
                hull = Arrays.asList(
                    new Point(minX - 8, minY - 8),
                    new Point(maxX + 8, minY - 8),
                    new Point(maxX + 8, maxY + 8),
                    new Point(minX - 8, maxY + 8)
                );
            }

            contentStream.setStrokingColor(java.awt.Color.DARK_GRAY);
            contentStream.setLineWidth(2.0f);
            
            // Draw hull (rotated)
            float startX = drawX + (float)(hull.get(0).x - minX + hullPadding) * scale;
            float startY = drawY + (float)(contentHeight - (hull.get(0).y - minY + hullPadding)) * scale;
            contentStream.moveTo(startX, startY);
            for (int i = 1; i < hull.size(); i++) {
                float px = drawX + (float)(hull.get(i).x - minX + hullPadding) * scale;
                float py = drawY + (float)(contentHeight - (hull.get(i).y - minY + hullPadding)) * scale;
                contentStream.lineTo(px, py);
            }
            contentStream.closePath();
            contentStream.stroke();

            // Calculate dynamic radius to prevent overlap
            double minDistanceSq = Double.MAX_VALUE;
            if (seatCenters.size() > 1) {
                for (int i = 0; i < seatCenters.size(); i++) {
                     Point p1 = seatCenters.get(i);
                     for (int j = i + 1; j < seatCenters.size(); j++) {
                         Point p2 = seatCenters.get(j);
                         double dSq = (p1.x - p2.x)*(p1.x - p2.x) + (p1.y - p2.y)*(p1.y - p2.y);
                         if (dSq < minDistanceSq) {
                             minDistanceSq = dSq;
                         }
                     }
                }
            }
            
            float optimalRadius = 5.5f;
            if (minDistanceSq != Double.MAX_VALUE && minDistanceSq > 0) {
                 float dist = (float)Math.sqrt(minDistanceSq);
                 // Use 45% of distance for radius to ensure no overlap
                 optimalRadius = Math.min(5.5f, dist * 0.45f);
            }

            // Draw Seats and Row Labels
            float seatRadius = optimalRadius; 
            // Use calculated non-overlapping radius scaled to PDF
            float displayRadius = Math.max(1.5f, Math.min(12.0f, seatRadius * scale));

            if (sector.getSeatRows() != null) {
                for (SeatRowEntity row : sector.getSeatRows()) {
                    List<SeatEntity> rowSeats = row.getSeats();
                    if (rowSeats == null || rowSeats.isEmpty()) continue;

                    List<Point> rowPoints = new ArrayList<>();
                    for (SeatEntity seat : rowSeats) {
                        if (seat.getPositionX() == null || seat.getPositionY() == null) continue;
                        double sx = seat.getPositionX() * 0.4;
                        double sy = seat.getPositionY() * 0.4;
                        double rx = sx * Math.cos(rotationRad) - sy * Math.sin(rotationRad);
                        double ry = sx * Math.sin(rotationRad) + sy * Math.cos(rotationRad);
                        
                        float px = drawX + (float)(rx - minX + hullPadding) * scale;
                        float py = drawY + (float)(contentHeight - (ry - minY + hullPadding)) * scale;
                        rowPoints.add(new Point(px, py));

                        // Draw Seat
                        if (participantSeatIds.contains(seat.getSeatId())) {
                            contentStream.setNonStrokingColor(new java.awt.Color(33, 150, 243));
                            contentStream.setStrokingColor(new java.awt.Color(25, 118, 210)); // Darker blue border
                        } else {
                            contentStream.setNonStrokingColor(new java.awt.Color(230, 230, 230));
                            contentStream.setStrokingColor(java.awt.Color.GRAY); // Thin grey border
                        }
                        contentStream.setLineWidth(0.5f); // Thin border
                        drawCircle(contentStream, px, py, displayRadius);

                        // Seat number
                        if (scale > 0.35f) {
                            contentStream.beginText();
                            float labelFontSize = displayRadius * 1.1f;
                            contentStream.setFont(seatFont, labelFontSize);
                            contentStream.setNonStrokingColor(java.awt.Color.BLACK);
                            String label = seat.getOrderNumber() != null ? seat.getOrderNumber().toString() : "";
                            float tw = seatFont.getStringWidth(label) / 1000 * labelFontSize;
                            contentStream.newLineAtOffset(px - tw / 2, py - labelFontSize / 3);
                            safeShowText(contentStream, label);
                            contentStream.endText();
                        }
                    }

                    // Add row label (name) at the left side of the row
                    if (!rowPoints.isEmpty() && row.getName() != null) {
                        // Find the leftmost point in the row to place the label
                        Point leftmost = rowPoints.stream().min((p1, p2) -> Double.compare(p1.x, p2.x)).get();
                        
                        contentStream.beginText();
                        float rowFontSize = Math.max(8, displayRadius * 1.5f);
                        contentStream.setFont(rowFont, rowFontSize);
                        contentStream.setNonStrokingColor(java.awt.Color.BLACK);
                        String rowName = row.getName();
                        float rw = rowFont.getStringWidth(rowName) / 1000 * rowFontSize;
                        // Place it slightly to the left of the leftmost seat
                        contentStream.newLineAtOffset((float)leftmost.x - rw - displayRadius * 2, (float)leftmost.y - rowFontSize / 3);
                        safeShowText(contentStream, rowName);
                        contentStream.endText();
                    }
                }
            }
        }
    }

    private void drawCircle(PDPageContentStream contentStream, float x, float y, float radius) throws IOException {
        float k = 0.552284749831f; 
        contentStream.moveTo(x + radius, y);
        contentStream.curveTo(x + radius, y + radius * k, x + radius * k, y + radius, x, y + radius);
        contentStream.curveTo(x - radius * k, y + radius, x - radius, y + radius * k, x - radius, y);
        contentStream.curveTo(x - radius, y - radius * k, x - radius * k, y - radius, x, y - radius);
        contentStream.curveTo(x + radius * k, y - radius, x + radius, y - radius * k, x + radius, y);
        contentStream.fillAndStroke();
    }

    public String generateParticipantMapFilename(Long eventId, Long participantId) {
        try {
            // Fetch all required data for filename generation
            Optional<EventEntity> eventOpt = eventRepository.findById(eventId);
            Optional<ParticipantEntity> participantOpt = participantRepository.findByParticipantIdAndEventId(participantId, eventId);
            
            if (eventOpt.isEmpty() || participantOpt.isEmpty()) {
                log.warn("Event or participant not found for filename generation - eventId: {}, participantId: {}", eventId, participantId);
                return String.format("participant_map_%s_event_%d.pdf", participantId, eventId);
            }
            
            EventEntity event = eventOpt.get();
            ParticipantEntity participant = participantOpt.get();
            
            Optional<ShowEntity> showOpt = showRepository.findById(event.getShowId());
            if (showOpt.isEmpty()) {
                log.warn("Show not found for filename generation - eventId: {}", eventId);
                return String.format("participant_map_%s_event_%d.pdf", participantId, eventId);
            }
            
            ShowEntity show = showOpt.get();
            
            // Generate filename: participant_name_date_show_name_map.pdf
            String participantName = sanitizeFilename(participant.getName() != null ? participant.getName() : "unknown");
            String showName = sanitizeFilename(show.getName() != null ? show.getName() : "unknown_show");
            String date = event.getDateTime() != null ? 
                event.getDateTime().format(DateTimeFormatter.ofPattern("yyyy_MM_dd")) : "unknown_date";
            
            return String.format("%s_%s_%s_map.pdf", participantName, date, showName);
            
        } catch (Exception e) {
            log.error("Error generating filename for participant map: {}", e.getMessage());
            // Fallback to simple format
            return String.format("participant_map_%s_event_%d.pdf", participantId, eventId);
        }
    }
}
