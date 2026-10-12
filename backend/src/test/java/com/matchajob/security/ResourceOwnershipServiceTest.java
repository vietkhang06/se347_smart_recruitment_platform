package com.matchajob.security;

import com.matchajob.user.model.CandidateProfile;
import com.matchajob.user.repository.CandidateProfileRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Answers;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.access.AccessDeniedException;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("ResourceOwnershipService Unit Tests")
class ResourceOwnershipServiceTest {

    @Mock(answer = Answers.RETURNS_DEEP_STUBS)
    private JdbcClient jdbcClient;

    @Mock
    private CandidateProfileRepository candidateProfileRepository;

    private ResourceOwnershipService ownershipService;

    @BeforeEach
    void setUp() {
        ownershipService = new ResourceOwnershipService(jdbcClient, candidateProfileRepository);
    }

    @Nested
    @DisplayName("Candidate Profile Ownership Tests")
    class CandidateProfileOwnership {

        @Test
        @DisplayName("getCandidateProfileId resolves candidate ID from repository")
        void getCandidateProfileId_resolvesFromRepo() {
            UUID userId = UUID.randomUUID();
            UUID candidateId = UUID.randomUUID();
            CandidateProfile profile = CandidateProfile.builder().id(candidateId).userId(userId).build();

            when(candidateProfileRepository.findByUserId(userId)).thenReturn(Optional.of(profile));

            Optional<UUID> resolved = ownershipService.getCandidateProfileId(userId);
            assertThat(resolved).contains(candidateId);
        }

        @Test
        @DisplayName("getRequiredCandidateProfileId throws AccessDeniedException when profile not found")
        void getRequiredCandidateProfileId_notFound_throwsAccessDenied() {
            UUID userId = UUID.randomUUID();
            when(candidateProfileRepository.findByUserId(userId)).thenReturn(Optional.empty());
            when(jdbcClient.sql(anyString()).param(userId).query(UUID.class).optional())
                    .thenReturn(Optional.empty());

            assertThatThrownBy(() -> ownershipService.getRequiredCandidateProfileId(userId))
                    .isInstanceOf(AccessDeniedException.class)
                    .hasMessageContaining("candidate profile not found");
        }

        @Test
        @DisplayName("checkCandidateProfileOwnership permits owner candidate")
        void checkCandidateProfileOwnership_owner_success() {
            UUID userId = UUID.randomUUID();
            UUID candidateId = UUID.randomUUID();
            CandidateProfile profile = CandidateProfile.builder().id(candidateId).userId(userId).build();
            when(candidateProfileRepository.findByUserId(userId)).thenReturn(Optional.of(profile));

            ownershipService.checkCandidateProfileOwnership(userId, candidateId);
        }

        @Test
        @DisplayName("checkCandidateProfileOwnership rejects user attempting to access other candidate")
        void checkCandidateProfileOwnership_otherCandidate_throwsAccessDenied() {
            UUID userId = UUID.randomUUID();
            UUID myCandidateId = UUID.randomUUID();
            UUID otherCandidateId = UUID.randomUUID();
            CandidateProfile profile = CandidateProfile.builder().id(myCandidateId).userId(userId).build();
            when(candidateProfileRepository.findByUserId(userId)).thenReturn(Optional.of(profile));

            assertThatThrownBy(() -> ownershipService.checkCandidateProfileOwnership(userId, otherCandidateId))
                    .isInstanceOf(AccessDeniedException.class)
                    .hasMessageContaining("You can only access your own candidate profile");
        }
    }

    @Nested
    @DisplayName("Employer Job & Application Ownership Tests")
    class EmployerJobOwnership {

        @Test
        @DisplayName("checkEmployerJobOwnership throws IllegalArgumentException when job does not exist")
        void checkEmployerJobOwnership_jobNotFound() {
            UUID userId = UUID.randomUUID();
            UUID jobId = UUID.randomUUID();

            when(jdbcClient.sql(anyString()).param(jobId).query(Integer.class).single())
                    .thenReturn(0);

            assertThatThrownBy(() -> ownershipService.checkEmployerJobOwnership(userId, jobId))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Job not found");
        }

        @Test
        @DisplayName("checkEmployerJobOwnership permits authorized employer")
        void checkEmployerJobOwnership_authorized() {
            UUID userId = UUID.randomUUID();
            UUID jobId = UUID.randomUUID();

            when(jdbcClient.sql(anyString()).param(jobId).query(Integer.class).single())
                    .thenReturn(1);
            when(jdbcClient.sql(anyString()).params(jobId, userId, userId, userId).query(Integer.class).single())
                    .thenReturn(1);

            ownershipService.checkEmployerJobOwnership(userId, jobId);
        }

        @Test
        @DisplayName("checkEmployerJobOwnership rejects employer without rights to job")
        void checkEmployerJobOwnership_unauthorized_throwsAccessDenied() {
            UUID userId = UUID.randomUUID();
            UUID jobId = UUID.randomUUID();

            when(jdbcClient.sql(anyString()).param(jobId).query(Integer.class).single())
                    .thenReturn(1);
            when(jdbcClient.sql(anyString()).params(jobId, userId, userId, userId).query(Integer.class).single())
                    .thenReturn(0);

            assertThatThrownBy(() -> ownershipService.checkEmployerJobOwnership(userId, jobId))
                    .isInstanceOf(AccessDeniedException.class)
                    .hasMessageContaining("You do not have permission to manage this job");
        }

        @Test
        @DisplayName("checkEmployerApplicationOwnership rejects application when employer does not own job")
        void checkEmployerApplicationOwnership_jobNotOwned() {
            UUID userId = UUID.randomUUID();
            UUID applicationId = UUID.randomUUID();
            UUID jobId = UUID.randomUUID();

            when(jdbcClient.sql(anyString()).param(applicationId).query(UUID.class).optional())
                    .thenReturn(Optional.of(jobId));
            when(jdbcClient.sql(anyString()).param(jobId).query(Integer.class).single())
                    .thenReturn(1);
            when(jdbcClient.sql(anyString()).params(jobId, userId, userId, userId).query(Integer.class).single())
                    .thenReturn(0);

            assertThatThrownBy(() -> ownershipService.checkEmployerApplicationOwnership(userId, applicationId))
                    .isInstanceOf(AccessDeniedException.class)
                    .hasMessageContaining("You do not have permission to manage this job");
        }
    }

    @Nested
    @DisplayName("Application Access Tests")
    class ApplicationAccess {

        @Test
        @DisplayName("checkApplicationAccess permits candidate who submitted application")
        @SuppressWarnings("unchecked")
        void checkApplicationAccess_candidateOwner_permitted() {
            UUID userId = UUID.randomUUID();
            UUID applicationId = UUID.randomUUID();
            UUID candidateId = UUID.randomUUID();
            UUID jobId = UUID.randomUUID();

            when(jdbcClient.sql(anyString()).param(applicationId).query(any(RowMapper.class)).optional())
                    .thenReturn(Optional.of(new Object[]{candidateId, jobId}));

            when(candidateProfileRepository.findByUserId(userId))
                    .thenReturn(Optional.of(CandidateProfile.builder().id(candidateId).userId(userId).build()));

            ownershipService.checkApplicationAccess(userId, applicationId);
        }

        @Test
        @DisplayName("checkApplicationAccess permits employer whose company owns job")
        @SuppressWarnings("unchecked")
        void checkApplicationAccess_employerOwner_permitted() {
            UUID userId = UUID.randomUUID();
            UUID applicationId = UUID.randomUUID();
            UUID candidateId = UUID.randomUUID();
            UUID otherCandidateId = UUID.randomUUID();
            UUID jobId = UUID.randomUUID();

            when(jdbcClient.sql(anyString()).param(applicationId).query(any(RowMapper.class)).optional())
                    .thenReturn(Optional.of(new Object[]{otherCandidateId, jobId}));

            when(candidateProfileRepository.findByUserId(userId))
                    .thenReturn(Optional.of(CandidateProfile.builder().id(candidateId).userId(userId).build()));

            when(jdbcClient.sql(anyString()).params(jobId, userId, userId, userId).query(Integer.class).single())
                    .thenReturn(1);

            ownershipService.checkApplicationAccess(userId, applicationId);
        }

        @Test
        @DisplayName("checkApplicationAccess rejects unrelated user")
        @SuppressWarnings("unchecked")
        void checkApplicationAccess_unrelatedUser_rejected() {
            UUID userId = UUID.randomUUID();
            UUID applicationId = UUID.randomUUID();
            UUID otherCandidateId = UUID.randomUUID();
            UUID jobId = UUID.randomUUID();

            when(jdbcClient.sql(anyString()).param(applicationId).query(any(RowMapper.class)).optional())
                    .thenReturn(Optional.of(new Object[]{otherCandidateId, jobId}));

            when(candidateProfileRepository.findByUserId(userId))
                    .thenReturn(Optional.empty());
            when(jdbcClient.sql(anyString()).param(userId).query(UUID.class).optional())
                    .thenReturn(Optional.empty());

            when(jdbcClient.sql(anyString()).params(jobId, userId, userId, userId).query(Integer.class).single())
                    .thenReturn(0);

            assertThatThrownBy(() -> ownershipService.checkApplicationAccess(userId, applicationId))
                    .isInstanceOf(AccessDeniedException.class)
                    .hasMessageContaining("You do not have permission to access this application");
        }
    }
}
