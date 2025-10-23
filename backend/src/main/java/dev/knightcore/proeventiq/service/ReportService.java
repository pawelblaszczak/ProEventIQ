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
    
    // (Removed PageContext helper; use explicit page checks in createPdfReport)
    
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
            
            PDPageContentStream contentStream = new PDPageContentStream(document, page);
            try {
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
                float titleWidth = headerFont.getStringWidth(reportTitle) / 1000 * 20;
                float pageWidth = page.getMediaBox().getWidth();
                float titleX = (pageWidth - titleWidth) / 2;
                
                // Save original yPosition for logo alignment
                float titleYPosition = yPosition;
                
                // Draw title
                contentStream.beginText();
                contentStream.setFont(headerFont, 20);
                contentStream.newLineAtOffset(titleX, yPosition);
                safeShowText(contentStream, reportTitle);
                contentStream.endText();
                
                // Add organizer logo on the right side, aligned with the title
                if (organizer != null && organizer.getThumbnail() != null && organizer.getThumbnailContentType() != null) {
                    try {
                        // Try direct PDFBox embed first
                        PDImageXObject logoImage;
                        try {
                            logoImage = PDImageXObject.createFromByteArray(document, organizer.getThumbnail(), "organizer_logo");
                        } catch (Exception inner) {
                            // Fallback: try decoding with ImageIO and wrap with LosslessFactory
                            BufferedImage buffered = tryDecodeImage(organizer.getThumbnail());
                            if (buffered != null) {
                                logoImage = LosslessFactory.createFromImage(document, buffered);
                            } else {
                                throw new IOException("Could not decode organizer thumbnail (ImageIO + SVG fallback failed)");
                            }
                        }

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
                    // ensure space for organizer block
                    var _ps = ensurePageHasSpace(document, page, contentStream, margin, yPosition, 100);
                    page = _ps.page; contentStream = _ps.contentStream; yPosition = _ps.yPosition;
                    contentStream.beginText();
                    contentStream.setFont(headerFont, 14);
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
                    contentStream.beginText();
                    contentStream.setFont(bodyFont, 12);
                    contentStream.newLineAtOffset(margin + 20, yPosition);
                    safeShowText(contentStream, "Name: " + organizerName);
                    contentStream.endText();
                    yPosition -= lineHeight;
                    
                    // Organizer email
                    contentStream.beginText();
                    contentStream.setFont(bodyFont, 12);
                    contentStream.newLineAtOffset(margin + 20, yPosition);
                    safeShowText(contentStream, "Email: " + organizerEmail);
                    contentStream.endText();
                    yPosition -= lineHeight;
                    
                    // Organizer address
                    contentStream.beginText();
                    contentStream.setFont(bodyFont, 12);
                    contentStream.newLineAtOffset(margin + 20, yPosition);
                    safeShowText(contentStream, "Address: " + organizerAddress);
                    contentStream.endText();
                    yPosition -= lineHeight + 10; // Extra spacing after organizer section
                }

                // Reservation holder label and name
                // ensure space for reservation holder
                var _ps2 = ensurePageHasSpace(document, page, contentStream, margin, yPosition, 60);
                page = _ps2.page; contentStream = _ps2.contentStream; yPosition = _ps2.yPosition;
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
                var _ps3 = ensurePageHasSpace(document, page, contentStream, margin, yPosition, 120);
                page = _ps3.page; contentStream = _ps3.contentStream; yPosition = _ps3.yPosition;
                var psDate = addSection(document, page, contentStream, headerFont, bodyFont, margin, yPosition, lineHeight,
                    "Date & location", new String[]{
                        "Date & Time: " + (event.getDateTime() != null ? event.getDateTime().format(DATE_TIME_FORMATTER) : "N/A"),
                        "Venue: " + (venue.getName() != null ? venue.getName() : "N/A"),
                        "Address: " + formatAddress(venue)
                    });
                page = psDate.page; contentStream = psDate.contentStream; yPosition = psDate.yPosition;
                
                // Show information with thumbnail layout
                var _ps4 = ensurePageHasSpace(document, page, contentStream, margin, yPosition, 160);
                page = _ps4.page; contentStream = _ps4.contentStream; yPosition = _ps4.yPosition;
                var psShow = addShowSection(document, page, contentStream, headerFont, bodyFont, margin, yPosition, lineHeight, show);
                page = psShow.page; contentStream = psShow.contentStream; yPosition = psShow.yPosition;

                // Seats section - show reserved seats grouped by sector and row
                var _ps5 = ensurePageHasSpace(document, page, contentStream, margin, yPosition, 200);
                page = _ps5.page; contentStream = _ps5.contentStream; yPosition = _ps5.yPosition;
                var psSeats = addSeatsSection(document, page, contentStream, headerFont, bodyFont, margin, yPosition, lineHeight, event, participant);
                page = psSeats.page; contentStream = psSeats.contentStream; yPosition = psSeats.yPosition;
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
            } finally {
                try { if (contentStream != null) contentStream.close(); } catch (Exception ignored) {}
            }
            
            // Convert to byte array
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            document.save(baos);
            return baos.toByteArray();
        }
    }

    private PageState addSeatsSection(PDDocument document, PDPage page, PDPageContentStream contentStream, PDFont headerFont, PDFont bodyFont,
                                  float margin, float yPosition, float lineHeight, EventEntity event, ParticipantEntity participant) throws IOException {
        // Section title
        contentStream.setFont(headerFont, 14);
        contentStream.beginText();
        contentStream.newLineAtOffset(margin, yPosition);
        safeShowText(contentStream, "Seats");
        contentStream.endText();
        yPosition -= lineHeight + 5;

        // Fetch reservations for this participant and event
        java.util.List<dev.knightcore.proeventiq.entity.ReservationEntity> reservations = reservationRepository.findByEventIdAndParticipantId(event.getEventId(), participant.getParticipantId());

        if (reservations.isEmpty()) {
            contentStream.setFont(bodyFont, 12);
            contentStream.beginText();
            contentStream.newLineAtOffset(margin + 20, yPosition);
            safeShowText(contentStream, "No seats reserved");
            contentStream.endText();
            yPosition -= lineHeight + 10;
            return new PageState(page, contentStream, yPosition);
        }

        // Load seat entities
        java.util.Map<Long, dev.knightcore.proeventiq.entity.SeatEntity> seatMap = new java.util.HashMap<>();
        for (var res : reservations) {
            seatRepository.findById(res.getSeatId()).ifPresent(s -> seatMap.put(s.getSeatId(), s));
        }

        // Group by sector -> row -> list of seat orderNumbers
        java.util.Map<String, java.util.Map<String, java.util.List<Integer>>> grouped = new java.util.TreeMap<>();
        for (var seat : seatMap.values()) {
            var row = seat.getSeatRow();
            if (row == null) continue;
            var sector = row.getSector();
            String sectorName = sector != null ? (sector.getName() != null ? sector.getName() : "Sector " + sector.getSectorId()) : "Unknown sector";
            String rowName = row.getName() != null ? row.getName() : (row.getOrderNumber() != null ? "Row " + row.getOrderNumber() : "Unknown row");

            grouped.computeIfAbsent(sectorName, k -> new java.util.TreeMap<>());
            var rows = grouped.get(sectorName);
            rows.computeIfAbsent(rowName, k -> new java.util.ArrayList<>());
            var seatNumbers = rows.get(rowName);
            if (seat.getOrderNumber() != null) seatNumbers.add(seat.getOrderNumber());
        }

        int overallTotal = 0;
        contentStream.setFont(bodyFont, 12);

        // Table column x offsets
        float col1X = margin + 20;             // Row
        float col2X = margin + 140;            // Seats (ranges)
        float col3X = margin + 420;            // Total
        float rangesMaxWidth = col3X - col2X - 10;
    // Table horizontal bounds used for drawing separators and backgrounds
    float tableLeft = col1X - 20;
    float tableRight = col3X + 60;

    for (var sectorEntry : grouped.entrySet()) {
            // Sector title
            var _psSect = ensurePageHasSpace(document, page, contentStream, margin, yPosition, 40);
            page = _psSect.page; contentStream = _psSect.contentStream; yPosition = _psSect.yPosition;
            contentStream.beginText();
            contentStream.setFont(headerFont, 12);
            contentStream.newLineAtOffset(margin + 10, yPosition);
            safeShowText(contentStream, "Sector: " + sectorEntry.getKey());
            contentStream.endText();
            yPosition -= lineHeight;

            // Table header
            contentStream.beginText();
            contentStream.setFont(headerFont, 11);
            contentStream.newLineAtOffset(col1X, yPosition);
            safeShowText(contentStream, "Row");
            contentStream.endText();

            contentStream.beginText();
            contentStream.setFont(headerFont, 11);
            contentStream.newLineAtOffset(col2X, yPosition);
            safeShowText(contentStream, "Seats");
            contentStream.endText();

            contentStream.beginText();
            contentStream.setFont(headerFont, 11);
            contentStream.newLineAtOffset(col3X, yPosition);
            safeShowText(contentStream, "Total");
            contentStream.endText();
            // Table horizontal separators will be drawn only above summary rows;
            // use alternating background for data rows instead.

            yPosition -= lineHeight;

            int sectorTotal = 0;
            int rowIdx = 0; // for alternating backgrounds per row within this sector
            contentStream.setFont(bodyFont, 11);

            for (var rowEntry : sectorEntry.getValue().entrySet()) {
                var seatNums = rowEntry.getValue();
                seatNums.sort(Integer::compareTo);
                int rowCount = seatNums.size();
                sectorTotal += rowCount;
                overallTotal += rowCount;

                String ranges = buildRanges(seatNums);
                String[] wrapped = wrapText(ranges, rangesMaxWidth, bodyFont, 11);

                boolean firstLine = true;
                boolean fillDark = (rowIdx % 2 == 0);

                // Ensure there's enough space for the whole wrapped row (all lines)
                int requiredHeight = Math.max( (int)(wrapped.length * lineHeight) + 8, 40);
                var _psRow = ensurePageHasSpace(document, page, contentStream, margin, yPosition, requiredHeight);
                page = _psRow.page; contentStream = _psRow.contentStream; yPosition = _psRow.yPosition;

                // Draw alternating background rectangle covering the whole logical row using font metrics
                float fontSize = 11f; // we're using bodyFont at 11
                var fd = bodyFont.getFontDescriptor();
                float ascent = fd != null && fd.getAscent() != 0 ? fd.getAscent() / 1000f * fontSize : fontSize * 0.7f;
                float descent = fd != null ? Math.abs(fd.getDescent()) / 1000f * fontSize : fontSize * 0.2f;
                float singleLineHeight = ascent + descent + 2f; // small extra leading
                float totalRowHeight = singleLineHeight * wrapped.length;
                float padding = 2f;
                // rectTop is slightly above the ascent of the first line; rectY is bottom of the rectangle
                float rectTop = yPosition + ascent + padding;
                float rectY = rectTop - totalRowHeight - padding;
                float rectHeight = totalRowHeight + padding * 2f;
                try {
                    if (fillDark) contentStream.setNonStrokingColor(0.94f); else contentStream.setNonStrokingColor(0.98f);
                    contentStream.addRect(tableLeft, rectY, tableRight - tableLeft, rectHeight);
                    contentStream.fill();
                    // Restore fill color for text
                    contentStream.setNonStrokingColor(0f);
                } catch (IOException ignored) {}

                for (String line : wrapped) {
                    // Row name only on first wrapped line
                    if (firstLine) {
                        contentStream.beginText();
                        contentStream.newLineAtOffset(col1X, yPosition);
                        safeShowText(contentStream, rowEntry.getKey());
                        contentStream.endText();
                    }

                    // Seats/ranges
                    contentStream.beginText();
                    contentStream.newLineAtOffset(col2X, yPosition);
                    safeShowText(contentStream, line);
                    contentStream.endText();

                    // Total only on first line (right-aligned inside Total column)
                    if (firstLine) {
                        String val = String.valueOf(rowCount);
                        float valFontSize = 11f;
                        float valWidth = bodyFont.getStringWidth(val) / 1000f * valFontSize;
                        float rightEdge = tableRight - 12f; // padding from right bound
                        float valX = rightEdge - valWidth;
                        contentStream.beginText();
                        contentStream.newLineAtOffset(valX, yPosition);
                        safeShowText(contentStream, val);
                        contentStream.endText();
                    }

                    yPosition -= lineHeight;
                    firstLine = false;
                }
                rowIdx++;
            }

            // Sector total row
            // Draw horizontal separator above the sector total summary row
            var _psSectTotal = ensurePageHasSpace(document, page, contentStream, margin, yPosition, 30);
            page = _psSectTotal.page; contentStream = _psSectTotal.contentStream; yPosition = _psSectTotal.yPosition;
            try {
                contentStream.setStrokingColor(0.7f, 0.7f, 0.7f);
                contentStream.setLineWidth(0.6f);
                float sepY = yPosition + (lineHeight - 8f);
                contentStream.moveTo(tableLeft, sepY);
                contentStream.lineTo(tableRight, sepY);
                contentStream.stroke();
            } catch (IOException ignored) {}
            contentStream.setFont(headerFont, 11);
            // Right-align sector total value with Total column
            String sectorLabel = "Sector total:";
            String sectorVal = String.valueOf(sectorTotal);
            float labelFontSize = 11f;
            float valFontSize = 11f;
            float labelWidth = headerFont.getStringWidth(sectorLabel) / 1000f * labelFontSize;
            float valWidth = headerFont.getStringWidth(sectorVal) / 1000f * valFontSize;
            float rightEdge = tableRight - 12f;
            float valX = rightEdge - valWidth;
            float labelX = valX - 8f - labelWidth;
            contentStream.beginText();
            contentStream.newLineAtOffset(labelX, yPosition);
            safeShowText(contentStream, sectorLabel);
            contentStream.endText();
            contentStream.beginText();
            contentStream.newLineAtOffset(valX, yPosition);
            safeShowText(contentStream, sectorVal);
            contentStream.endText();
            yPosition -= lineHeight + 5;
        }

        // Overall total
    var _psEnd = ensurePageHasSpace(document, page, contentStream, margin, yPosition, 40);
    page = _psEnd.page; contentStream = _psEnd.contentStream; yPosition = _psEnd.yPosition;
    try {
        contentStream.setStrokingColor(0.7f, 0.7f, 0.7f);
        contentStream.setLineWidth(0.7f);
        float sepY = yPosition + (lineHeight - 8f);
        contentStream.moveTo(tableLeft, sepY);
        contentStream.lineTo(tableRight, sepY);
        contentStream.stroke();
    } catch (IOException ignored) {}
    contentStream.setFont(headerFont, 12);
    // Right-align overall total label and value to the Total column
    String totalLabel = "Total seats reserved:";
    String totalVal = String.valueOf(overallTotal);
    float totalLabelSize = 12f;
    float totalValSize = 12f;
    float totalLabelWidth = headerFont.getStringWidth(totalLabel) / 1000f * totalLabelSize;
    float totalValWidth = headerFont.getStringWidth(totalVal) / 1000f * totalValSize;
    float totalRightEdge = tableRight - 12f;
    float totalValX = totalRightEdge - totalValWidth;
    float totalLabelX = totalValX - 8f - totalLabelWidth;
    contentStream.beginText();
    contentStream.newLineAtOffset(totalLabelX, yPosition);
    safeShowText(contentStream, totalLabel);
    contentStream.endText();
    contentStream.beginText();
    contentStream.newLineAtOffset(totalValX, yPosition);
    safeShowText(contentStream, totalVal);
    contentStream.endText();
    yPosition -= lineHeight + 10;

    return new PageState(page, contentStream, yPosition);
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
