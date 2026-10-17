package com.matchajob.application.service;

import com.matchajob.application.dto.*;
import com.matchajob.application.model.ApplicationEntity;
import com.matchajob.application.model.InterviewEntity;
import com.matchajob.application.repository.ApplicationRepository;
import com.matchajob.application.repository.InterviewRepository;
import com.matchajob.security.ResourceOwnershipService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.simple.JdbcClient;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("InterviewService Unit Tests")
class InterviewServiceTest {

    @Mock
    private InterviewRepository interviewRepository;

    @Mock
    private ApplicationRepository applicationRepository;

    @Mock
    private ResourceOwnershipService resourceOwnershipService;

    @Mock
    private JdbcClient jdbcClient;

    private InterviewService interviewService;

    @BeforeEach
    void setUp() {
        interviewService = new InterviewService(
                interviewRepository,
                applicationRepository,
                resourceOwnershipService,
                jdbcClient
        );
    }

    @Test
    @DisplayName("Status mappings: Vietnamese to DB constraint values")
    void testStatusMappingToDb() {
        assertThat(InterviewService.mapToDbStatus("Đã xác nhận")).isEqualTo("confirmed");
        assertThat(InterviewService.mapToDbStatus("Hoàn tất")).isEqualTo("completed");
        assertThat(InterviewService.mapToDbStatus("Đã hủy")).isEqualTo("cancelled");
        assertThat(InterviewService.mapToDbStatus("Chờ xác nhận")).isEqualTo("pending_confirm");
        assertThat(InterviewService.mapToDbStatus("Đề nghị đổi lịch")).isEqualTo("pending_confirm");
        assertThat(InterviewService.mapToDbStatus("Sắp diễn ra")).isEqualTo("scheduled");
        assertThat(InterviewService.mapToDbStatus("unknown")).isEqualTo("scheduled");
    }

    @Test
    @DisplayName("Status mappings: DB constraint values to Vietnamese labels")
    void testStatusMappingToLabel() {
        assertThat(InterviewService.mapToVietnameseLabel("confirmed")).isEqualTo("Đã xác nhận");
        assertThat(InterviewService.mapToVietnameseLabel("completed")).isEqualTo("Hoàn tất");
        assertThat(InterviewService.mapToVietnameseLabel("cancelled")).isEqualTo("Đã hủy");
        assertThat(InterviewService.mapToVietnameseLabel("pending_confirm")).isEqualTo("Chờ xác nhận");
        assertThat(InterviewService.mapToVietnameseLabel("scheduled")).isEqualTo("Sắp diễn ra");
    }

    @Test
    @DisplayName("ScheduledAt parsing from ISO or date + time")
    void testParseScheduledAt() {
        Instant instant = Instant.parse("2026-10-18T10:30:00Z");
        assertThat(InterviewService.parseScheduledAt(instant, null, null)).isEqualTo(instant);

        Instant parsed = InterviewService.parseScheduledAt(null, "2026-10-18", "09:30");
        assertThat(parsed).isNotNull();
    }

    @Test
    @DisplayName("Update interview status modifies status and note")
    void testUpdateInterviewStatus() {
        UUID userId = UUID.randomUUID();
        UUID interviewId = UUID.randomUUID();
        UUID applicationId = UUID.randomUUID();

        InterviewEntity entity = InterviewEntity.builder()
                .id(interviewId)
                .applicationId(applicationId)
                .status("scheduled")
                .build();

        when(interviewRepository.findById(interviewId)).thenReturn(Optional.of(entity));
        when(interviewRepository.saveAndFlush(any(InterviewEntity.class))).thenAnswer(i -> i.getArgument(0));

        // Mock jdbcClient for getInterviewById
        var statementSpec = mock(JdbcClient.StatementSpec.class);
        @SuppressWarnings("unchecked")
        JdbcClient.MappedQuerySpec<InterviewResponse> mappedSpec = mock(JdbcClient.MappedQuerySpec.class);
        when(jdbcClient.sql(anyString())).thenReturn(statementSpec);
        when(statementSpec.param(any())).thenReturn(statementSpec);
        when(statementSpec.query(any(org.springframework.jdbc.core.RowMapper.class))).thenReturn(mappedSpec);
        when(mappedSpec.optional()).thenReturn(Optional.of(
                InterviewResponse.builder()
                        .id(interviewId)
                        .applicationId(applicationId)
                        .status("Hoàn tất")
                        .build()
        ));

        InterviewResponse response = interviewService.updateInterviewStatus(userId, interviewId, "Hoàn tất", "Buổi phỏng vấn tốt");

        assertThat(response).isNotNull();
        assertThat(entity.getStatus()).isEqualTo("completed");
        verify(interviewRepository).saveAndFlush(entity);
    }
}
