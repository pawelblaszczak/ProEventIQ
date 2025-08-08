package dev.knightcore.proeventiq.repository;

import dev.knightcore.proeventiq.entity.ParticipantEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ParticipantRepository extends JpaRepository<ParticipantEntity, Long> {
    List<ParticipantEntity> findByEventId(Long eventId);
    Optional<ParticipantEntity> findByParticipantIdAndEventId(Long participantId, Long eventId);
    void deleteByParticipantIdAndEventId(Long participantId, Long eventId);
    boolean existsByParticipantIdAndEventId(Long participantId, Long eventId);
}
