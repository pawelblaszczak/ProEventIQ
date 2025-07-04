package dev.knightcore.proeventiq.repository;

import dev.knightcore.proeventiq.entity.ParticipantEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ParticipantRepository extends JpaRepository<ParticipantEntity, String> {
    List<ParticipantEntity> findByEventId(Long eventId);
    Optional<ParticipantEntity> findByParticipantIdAndEventId(String participantId, Long eventId);
    void deleteByParticipantIdAndEventId(String participantId, Long eventId);
    boolean existsByParticipantIdAndEventId(String participantId, Long eventId);
}
