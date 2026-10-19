package com.matchajob.application.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InterviewResponse {

    private UUID id;
    private UUID applicationId;
    private UUID candidateId;
    private String candidateName;
    private String candidateEmail;
    private String candidatePhone;

    private UUID jobId;
    private String jobTitle;
    private UUID companyId;
    private String companyName;

    private Instant scheduledAt;
    private String date; // YYYY-MM-DD
    private String time; // HH:mm
    private Integer durationMin;

    private String interviewType;
    private String interviewMode;
    private String meetingLink;
    private String location;
    private String participants;
    private String note;

    private String status;       // scheduled, confirmed, pending_confirm, completed, cancelled
    private String statusLabel;  // Sắp diễn ra, Đã xác nhận, Chờ xác nhận, Hoàn tất, Đã hủy

    // Alias properties for full frontend compatibility
    private String candidate;
    private String role;
    private String type;
    private String people;

    private Instant createdAt;
    private Instant updatedAt;
}
