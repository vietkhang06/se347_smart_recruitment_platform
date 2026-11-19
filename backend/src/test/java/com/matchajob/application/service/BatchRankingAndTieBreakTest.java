package com.matchajob.application.service;

import com.matchajob.application.dto.ApplicationRankingItem;
import com.matchajob.application.repository.ApplicationRepository;
import com.matchajob.application.repository.ApplicationStatusHistoryRepository;
import com.matchajob.cv.repository.ApplicationCvSnapshotRepository;
import com.matchajob.cv.repository.CvVersionRepository;
import com.matchajob.matching.repository.MatchResultRepository;
import com.matchajob.processing.service.ProcessingJobService;
import com.matchajob.security.ResourceOwnershipService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.simple.JdbcClient;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@DisplayName("Batch Ranking & Deterministic Ordering Unit Tests")
class BatchRankingAndTieBreakTest {

    private JdbcClient jdbcClient;
    private ApplicationService applicationService;

    @BeforeEach
    void setUp() {
        jdbcClient = mock(JdbcClient.class);
        applicationService = new ApplicationService(
                mock(ApplicationRepository.class),
                mock(ApplicationStatusHistoryRepository.class),
                mock(CvVersionRepository.class),
                mock(ApplicationCvSnapshotRepository.class),
                mock(MatchResultRepository.class),
                mock(ProcessingJobService.class),
                mock(ApplicationStateMachine.class),
                jdbcClient,
                mock(ResourceOwnershipService.class)
        );
    }

    @Test
    @DisplayName("getJobRankings generates SQL with deterministic 3-tier tie-breaking: score DESC, applied_at ASC, id ASC")
    @SuppressWarnings("unchecked")
    void getJobRankings_sqlContainsDeterministicTieBreakers() {
        UUID jobId = UUID.randomUUID();

        JdbcClient.StatementSpec mockSpec = mock(JdbcClient.StatementSpec.class);
        JdbcClient.MappedQuerySpec<ApplicationRankingItem> mockQuerySpec = mock(JdbcClient.MappedQuerySpec.class);

        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        when(jdbcClient.sql(sqlCaptor.capture())).thenReturn(mockSpec);
        when(mockSpec.param(any())).thenReturn(mockSpec);
        when(mockSpec.query(any(RowMapper.class))).thenReturn(mockQuerySpec);
        when(mockQuerySpec.list()).thenReturn(List.of());

        applicationService.getJobRankings(jobId, null, null);

        String generatedSql = sqlCaptor.getValue();
        assertThat(generatedSql).contains("ORDER BY mr.overall_score DESC NULLS LAST, a.applied_at ASC, a.id ASC");
    }

    @Test
    @DisplayName("Deterministic ranking & RowMapper: assigns 1-based ranks and handles null scores")
    @SuppressWarnings("unchecked")
    void rankingOrdering_rowMapperAndRankAssignment() throws Exception {
        UUID jobId = UUID.randomUUID();
        UUID appId1 = UUID.fromString("00000000-0000-0000-0000-000000000001");
        UUID appId2 = UUID.fromString("00000000-0000-0000-0000-000000000002");
        Instant now = Instant.now();

        JdbcClient.StatementSpec mockSpec = mock(JdbcClient.StatementSpec.class);
        ArgumentCaptor<RowMapper<ApplicationRankingItem>> mapperCaptor = ArgumentCaptor.forClass(RowMapper.class);

        when(jdbcClient.sql(anyString())).thenReturn(mockSpec);
        when(mockSpec.param(any())).thenReturn(mockSpec);
        when(mockSpec.query(mapperCaptor.capture())).thenAnswer(invocation -> {
            RowMapper<ApplicationRankingItem> mapper = invocation.getArgument(0);

            // Row 1: High score 95
            java.sql.ResultSet rs1 = mock(java.sql.ResultSet.class);
            when(rs1.getObject("application_id", UUID.class)).thenReturn(appId1);
            when(rs1.getObject("candidate_id", UUID.class)).thenReturn(UUID.randomUUID());
            when(rs1.getString("candidate_name")).thenReturn("Alice");
            when(rs1.getString("stage")).thenReturn("applied");
            when(rs1.getObject("overall_score")).thenReturn(95);
            when(rs1.getInt("overall_score")).thenReturn(95);
            when(rs1.getTimestamp("applied_at")).thenReturn(java.sql.Timestamp.from(now.minusSeconds(100)));

            // Row 2: Null score candidate
            java.sql.ResultSet rs2 = mock(java.sql.ResultSet.class);
            when(rs2.getObject("application_id", UUID.class)).thenReturn(appId2);
            when(rs2.getObject("candidate_id", UUID.class)).thenReturn(UUID.randomUUID());
            when(rs2.getString("candidate_name")).thenReturn("Bob");
            when(rs2.getString("stage")).thenReturn("screening");
            when(rs2.getObject("overall_score")).thenReturn(null);
            when(rs2.getTimestamp("applied_at")).thenReturn(null);

            ApplicationRankingItem item1 = mapper.mapRow(rs1, 0);
            ApplicationRankingItem item2 = mapper.mapRow(rs2, 1);

            JdbcClient.MappedQuerySpec<ApplicationRankingItem> querySpec = mock(JdbcClient.MappedQuerySpec.class);
            when(querySpec.list()).thenReturn(List.of(item1, item2));
            return querySpec;
        });

        var response = applicationService.getJobRankings(jobId, null, null);

        assertThat(response.getTotalCandidates()).isEqualTo(2);
        assertThat(response.getItems()).hasSize(2);

        ApplicationRankingItem item1 = response.getItems().get(0);
        assertThat(item1.getRanking()).isEqualTo(1);
        assertThat(item1.getApplicationId()).isEqualTo(appId1);
        assertThat(item1.getCandidateName()).isEqualTo("Alice");
        assertThat(item1.getOverallScore()).isEqualTo(95);

        ApplicationRankingItem item2 = response.getItems().get(1);
        assertThat(item2.getRanking()).isEqualTo(2);
        assertThat(item2.getApplicationId()).isEqualTo(appId2);
        assertThat(item2.getCandidateName()).isEqualTo("Bob");
        assertThat(item2.getOverallScore()).isNull();
        assertThat(item2.getAppliedAt()).isNull();
    }
}
